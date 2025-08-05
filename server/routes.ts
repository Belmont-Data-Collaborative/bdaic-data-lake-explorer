import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { createAwsS3Service } from "./lib/aws";
import { openAIService } from "./lib/openai";
import { insertAwsConfigSchema, insertDatasetSchema, registerUserSchema, loginUserSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken, authorizeRole, requireAdmin, requireUser, AuthRequest } from "./middleware/auth";

// Simple cache for expensive operations
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCached<T>(key: string, ttl: number = 30000): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any, ttl: number = 30000): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

function invalidateCache(pattern?: string): void {
  if (pattern) {
    const keys = Array.from(cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Enhanced cache warming with performance optimizations
async function warmCache(): Promise<void> {
  try {
    console.log('Warming cache with performance optimizations...');
    const startTime = Date.now();
    
    // Warm up critical endpoints with parallel execution
    const [datasets, lastRefreshTime] = await Promise.all([
      storage.getDatasets(),
      storage.getLastRefreshTime(),
    ]);
    
    // Pre-compute all critical data structures
    const folders = Array.from(new Set(datasets.map(d => d.topLevelFolder).filter(Boolean)));
    const totalSize = datasets.reduce((sum, dataset) => sum + Number(dataset.sizeBytes), 0);
    const uniqueDataSources = new Set();
    const folderStats = new Map<string, { count: number; size: number }>();
    
    // Single pass through datasets for all computations
    datasets.forEach(d => {
      // Data sources computation
      if (d.metadata && (d.metadata as any).dataSource) {
        (d.metadata as any).dataSource
          .split(',')
          .map((s: string) => s.trim())
          .forEach((s: string) => uniqueDataSources.add(s));
      }
      
      // Folder statistics
      const folder = d.topLevelFolder;
      if (folder) {
        const current = folderStats.get(folder) || { count: 0, size: 0 };
        folderStats.set(folder, {
          count: current.count + 1,
          size: current.size + Number(d.sizeBytes || 0),
        });
      }
    });
    
    // Set multiple cache entries with optimized TTL
    const cacheOps = [
      ['datasets-all', datasets, 300000], // 5 minutes
      ['folders', folders, 3600000], // 1 hour
      ['folder-stats', Object.fromEntries(folderStats), 1800000], // 30 minutes
      ['quick-stats', {
        totalCount: datasets.length,
        folders,
        lastUpdated: new Date().toISOString()
      }, 300000], // 5 minutes
      ['precomputed-stats', {
        totalDatasets: datasets.length,
        totalSize: formatFileSize(totalSize),
        dataSources: uniqueDataSources.size,
        lastUpdated: lastRefreshTime ? getTimeAgo(lastRefreshTime) : "Never",
        lastRefreshTime: lastRefreshTime ? lastRefreshTime.toISOString() : null,
      }, 1800000], // 30 minutes
    ] as const;
    
    cacheOps.forEach(([key, data, ttl]) => setCache(key, data, ttl));
    
    const elapsedTime = Date.now() - startTime;
    console.log(`Cache warmed successfully in ${elapsedTime}ms - preloaded ${datasets.length} datasets, ${folders.length} folders`);
  } catch (error) {
    console.error('Error warming cache:', error);
  }
}

// Warm cache every 10 minutes
setInterval(warmCache, 10 * 60 * 1000);

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cache headers and compression hints for API responses
  app.use("/api", (req, res, next) => {
    // Set cache headers for GET requests
    if (req.method === "GET") {
      // Different cache durations based on endpoint
      if (req.path.includes('/stats') || req.path.includes('/quick-stats')) {
        res.set("Cache-Control", "public, max-age=1800"); // 30 minutes for stats
      } else if (req.path.includes('/folders') && !req.path.includes('/community-data-points')) {
        res.set("Cache-Control", "public, max-age=3600"); // 1 hour for folder lists
      } else if (req.path.includes('/aws-config')) {
        res.set("Cache-Control", "private, max-age=60"); // 1 minute for config
      } else {
        res.set("Cache-Control", "public, max-age=60"); // 1 minute default
      }
    }
    
    // Add compression hints for large responses
    if (req.path.includes('/datasets') || req.path.includes('/community-data-points')) {
      res.set("Content-Encoding-Hint", "gzip");
    }
    
    next();
  });
  
  // User Registration and Authentication endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validation = registerUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      const { username, email, password, role = "user" } = validation.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = await storage.createUser({
        username,
        email,
        passwordHash,
        role,
        isActive: true,
      });

      // Generate JWT token
      const token = storage.generateJWT(newUser);

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      // Try new user-based authentication first
      const userValidation = loginUserSchema.safeParse(req.body);
      if (userValidation.success) {
        const { username, password } = userValidation.data;
        
        console.log(`Login attempt for username: "${username}"`);
        const user = await storage.verifyUserPassword(username, password);
        
        if (user) {
          console.log(`Authentication SUCCESS for user: ${user.id} (${user.username}) with role: ${user.role}`);
          // Update last login time
          await storage.updateUserLastLogin(user.id);
          
          // Create a clean user object for JWT generation to avoid any reference issues
          const userForJWT = {
            id: user.id,
            username: user.username,
            role: user.role,
          };
          
          // Generate JWT token
          console.log(`Login: Generating JWT for user ${userForJWT.id} (${userForJWT.username}) with role ${userForJWT.role}`);
          const token = storage.generateJWT(userForJWT);
          console.log(`Login: JWT generated successfully for user ${userForJWT.id}`);
          
          // CRITICAL: Clear ALL user-specific caches to prevent data bleeding between sessions
          invalidateCache(`datasets-user-${user.id}`);
          invalidateCache(`stats-user-${user.id}`);
          invalidateCache(`folders-user-${user.id}`);
          invalidateCache(`user-data-${user.id}`);
          
          // Also clear any general caches that might persist cross-user data
          invalidateCache('datasets-all');
          invalidateCache('folders-all');
          invalidateCache('stats-all');
          
          console.log(`Login: Aggressively cleared ALL caches for user ${user.id} (${user.role}) to prevent data bleeding`);
          
          return res.json({ 
            success: true,
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            },
          });
        } else {
          console.log(`Authentication FAILED for username: "${username}"`);
        }
      } else {
        console.log('Login validation failed:', userValidation.error);
      }

      // Fall back to legacy password authentication
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const isValid = await storage.verifyPassword(password);
      
      if (isValid) {
        // Clear all caches for legacy authentication to prevent data bleeding
        invalidateCache('datasets-all');
        invalidateCache('folders-all');
        invalidateCache('stats-all');
        console.log(`Legacy login: Cleared all general caches to prevent data bleeding`);
        
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }
      
      // Check if there's already a password set
      const existingAuth = await storage.getAuthConfig();
      
      if (existingAuth) {
        // If password exists, verify current password
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        
        const isValidCurrent = await storage.verifyPassword(currentPassword);
        if (!isValidCurrent) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }
      
      await storage.setPassword(newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/auth/status", async (req, res) => {
    try {
      let authConfig = await storage.getAuthConfig();
      
      // If no password exists, create the default password "DataIsGood"
      if (!authConfig) {
        authConfig = await storage.setPassword("DataIsGood");
      }
      
      res.json({ hasPassword: !!authConfig });
    } catch (error) {
      console.error("Error checking auth status:", error);
      res.status(500).json({ message: "Failed to check auth status" });
    }
  });

  // User verification endpoint for JWT tokens
  app.get("/api/auth/verify", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log(`JWT verify endpoint: Decoded JWT contains user ID ${req.user!.id} (${req.user!.username})`);
      
      // CRITICAL: Get fresh user data from database based on JWT token ID
      const freshUser = await storage.getUserById(req.user!.id);
      
      if (!freshUser) {
        console.log(`JWT verify: User ${req.user!.id} not found in database`);
        return res.status(403).json({ message: "User not found" });
      }
      
      if (!freshUser.isActive) {
        console.log(`JWT verify: User ${req.user!.id} is inactive`);
        return res.status(403).json({ message: "User account is inactive" });
      }
      
      // CRITICAL: Return the fresh user data from database, not cached data
      console.log(`JWT verify: Fresh database lookup returned user ID=${freshUser.id}, username="${freshUser.username}", role="${freshUser.role}"`);
      
      // Double-check for data consistency
      if (freshUser.id !== req.user!.id) {
        console.error(`JWT verify: CRITICAL ERROR - JWT user ID ${req.user!.id} doesn't match database user ID ${freshUser.id}`);
        return res.status(403).json({ message: "Authentication data mismatch" });
      }
      
      // Return fresh user data
      res.json({
        user: {
          id: freshUser.id,
          username: freshUser.username,
          email: freshUser.email,
          role: freshUser.role,
        },
      });
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Admin routes - User management
  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const validation = updateUserSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      const updatedUser = await storage.updateUser(userId, validation.data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User routes - profile management
  app.get("/api/user/profile", authenticateToken, requireUser, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/user/profile", authenticateToken, requireUser, async (req: AuthRequest, res) => {
    try {
      const allowedUpdates = { username: req.body.username, email: req.body.email };
      const validation = updateUserSchema.pick({ username: true, email: true }).safeParse(allowedUpdates);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      const updatedUser = await storage.updateUser(req.user!.id, validation.data);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Role Management Routes (Admin only)
  app.get("/api/admin/roles", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post("/api/admin/roles", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Role name is required" });
      }

      // Check if role already exists
      const existingRole = await storage.getRoleByName(name);
      if (existingRole) {
        return res.status(409).json({ message: "Role with this name already exists" });
      }

      const role = await storage.createRole({
        name,
        description: description || null,
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put("/api/admin/roles/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const { name, description } = req.body;

      const updatedRole = await storage.updateRole(roleId, {
        name,
        description,
      });

      if (!updatedRole) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json(updatedRole);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/admin/roles/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      
      const success = await storage.deleteRole(roleId);
      if (!success) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // Role-Dataset Assignment Routes (Admin only)
  app.get("/api/admin/roles/:id/datasets", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const datasets = await storage.getDatasetsForRole(roleId);
      res.json(datasets);
    } catch (error) {
      console.error("Error fetching role datasets:", error);
      res.status(500).json({ message: "Failed to fetch role datasets" });
    }
  });

  app.post("/api/admin/roles/:id/datasets", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const { datasetId } = req.body;

      if (!datasetId || typeof datasetId !== 'number') {
        return res.status(400).json({ message: "Dataset ID is required" });
      }

      const assignment = await storage.assignDatasetToRole(roleId, datasetId);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning dataset to role:", error);
      res.status(500).json({ message: "Failed to assign dataset to role" });
    }
  });

  app.delete("/api/admin/roles/:roleId/datasets/:datasetId", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const datasetId = parseInt(req.params.datasetId);
      
      const success = await storage.removeDatasetFromRole(roleId, datasetId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json({ message: "Dataset removed from role successfully" });
    } catch (error) {
      console.error("Error removing dataset from role:", error);
      res.status(500).json({ message: "Failed to remove dataset from role" });
    }
  });

  // User-Role Assignment Routes (Admin only)
  app.get("/api/admin/users/:id/roles", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const roles = await storage.getRolesForUser(userId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  app.post("/api/admin/users/:id/roles", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { roleId } = req.body;

      if (!roleId || typeof roleId !== 'number') {
        return res.status(400).json({ message: "Role ID is required" });
      }

      // Check if the target user is an admin
      const targetUser = await storage.getUserById(userId);
      if (targetUser?.role === 'admin') {
        return res.status(400).json({ message: "Cannot assign roles to admin users. Admin users have full access to all folders." });
      }

      const assignment = await storage.assignUserToRole(userId, roleId, req.user!.id);
      
      // Clear the user's dataset cache since their access has changed
      const userCachePattern = `datasets-user-${userId}`;
      invalidateCache(userCachePattern);
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning role to user:", error);
      res.status(500).json({ message: "Failed to assign role to user" });
    }
  });

  app.delete("/api/admin/users/:userId/roles/:roleId", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);
      
      // Check if the target user is an admin
      const targetUser = await storage.getUserById(userId);
      if (targetUser?.role === 'admin') {
        return res.status(400).json({ message: "Cannot remove roles from admin users. Admin users have full access to all folders." });
      }
      
      const success = await storage.removeUserFromRole(userId, roleId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Clear the user's dataset cache since their access has changed  
      const userCachePattern = `datasets-user-${userId}`;
      invalidateCache(userCachePattern);

      res.json({ message: "Role removed from user successfully" });
    } catch (error) {
      console.error("Error removing role from user:", error);
      res.status(500).json({ message: "Failed to remove role from user" });
    }
  });

  // Role-Folder Assignment Routes (Admin only)
  app.get("/api/admin/roles/:id/folders", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const folders = await storage.getFoldersForRole(roleId);
      console.log(`Folders for role ${roleId}:`, folders);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching role folders:", error);
      res.status(500).json({ message: "Failed to fetch role folders" });
    }
  });

  app.post("/api/admin/roles/:id/folders", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const { folderName } = req.body;

      if (!folderName || typeof folderName !== 'string') {
        return res.status(400).json({ message: "Folder name is required" });
      }

      // Check if assignment already exists
      const existingFolders = await storage.getFoldersForRole(roleId);
      if (existingFolders.includes(folderName)) {
        return res.status(409).json({ message: "Folder is already assigned to this role" });
      }

      const assignment = await storage.assignFolderToRole(roleId, folderName);
      res.status(201).json(assignment);
    } catch (error: any) {
      console.error("Error assigning folder to role:", error);
      if (error.code === '23505') {
        return res.status(409).json({ message: "Folder is already assigned to this role" });
      }
      res.status(500).json({ message: "Failed to assign folder to role" });
    }
  });

  app.delete("/api/admin/roles/:roleId/folders/:folderName", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const folderName = decodeURIComponent(req.params.folderName);
      
      const success = await storage.removeFolderFromRole(roleId, folderName);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json({ message: "Folder removed from role successfully" });
    } catch (error) {
      console.error("Error removing folder from role:", error);
      res.status(500).json({ message: "Failed to remove folder from role" });
    }
  });

  // Get all unique top-level folders for role assignment
  app.get("/api/admin/folders", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const result = await storage.query("SELECT DISTINCT top_level_folder FROM datasets WHERE top_level_folder IS NOT NULL ORDER BY top_level_folder");
      const folders = result.map((row: any) => row.top_level_folder);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  // User's own role information
  app.get("/api/user/roles", authenticateToken, requireUser, async (req: AuthRequest, res) => {
    try {
      const roles = await storage.getRolesForUser(req.user!.id);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  // Public endpoints DISABLED for security - all access requires authentication
  app.get("/api/stats/public", async (req, res) => {
    res.status(401).json({ 
      message: "Authentication required. Please log in to access statistics.",
      requiresAuth: true 
    });
  });

  app.get("/api/datasets/public", async (req, res) => {
    res.status(401).json({ 
      message: "Authentication required. Please log in to access datasets.",
      requiresAuth: true 
    });
  });

  // AWS Configuration endpoints
  app.get("/api/aws-config", async (req, res) => {
    try {
      const config = await storage.getAwsConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching AWS config:", error);
      res.status(500).json({ message: "Failed to fetch AWS configuration" });
    }
  });

  app.post("/api/aws-config", async (req, res) => {
    try {
      const validatedConfig = insertAwsConfigSchema.parse(req.body);
      const config = await storage.upsertAwsConfig(validatedConfig);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        console.error("Error saving AWS config:", error);
        res.status(500).json({ message: "Failed to save AWS configuration" });
      }
    }
  });

  // Get all AWS configurations
  app.get("/api/aws-configs", async (req, res) => {
    try {
      const configs = await storage.getAllAwsConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching AWS configs:", error);
      res.status(500).json({ message: "Failed to fetch AWS configurations" });
    }
  });

  // Create new AWS configuration
  app.post("/api/aws-configs", async (req, res) => {
    try {
      const validatedConfig = insertAwsConfigSchema.parse(req.body);
      const config = await storage.createAwsConfig(validatedConfig);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        console.error("Error creating AWS config:", error);
        res.status(500).json({ message: "Failed to create AWS configuration" });
      }
    }
  });

  // Update AWS configuration
  app.put("/api/aws-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedConfig = insertAwsConfigSchema.partial().parse(req.body);
      const config = await storage.updateAwsConfig(id, validatedConfig);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        console.error("Error updating AWS config:", error);
        res.status(500).json({ message: "Failed to update AWS configuration" });
      }
    }
  });

  // Delete AWS configuration
  app.delete("/api/aws-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAwsConfig(id);
      if (!deleted) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json({ message: "Configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting AWS config:", error);
      res.status(500).json({ message: "Failed to delete AWS configuration" });
    }
  });

  // Set active AWS configuration
  app.post("/api/aws-configs/:id/activate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.setActiveAwsConfig(id);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      // Automatically refresh datasets when configuration is activated
      try {
        if (config.bucketName) {
          const s3Service = createAwsS3Service(config.region);
          
          // Test connection first
          const isConnected = await s3Service.testConnection(config.bucketName);
          if (isConnected) {
            // Fetch datasets from S3
            const s3Datasets = await s3Service.listDatasets(config.bucketName);
            
            // Upsert datasets to preserve IDs and insights
            for (const datasetData of s3Datasets) {
              await storage.upsertDataset(datasetData);
            }

            // Remove datasets that no longer exist in S3
            const existingDatasets = await storage.getDatasets();
            const s3DatasetNames = new Set(s3Datasets.map(d => `${d.name}|${d.source}`));
            
            for (const existing of existingDatasets) {
              const existingKey = `${existing.name}|${existing.source}`;
              if (!s3DatasetNames.has(existingKey)) {
                await storage.deleteDataset(existing.id);
              }
            }
          }
        }
      } catch (refreshError) {
        console.warn("Failed to refresh datasets during configuration activation:", refreshError);
        // Don't fail the activation if dataset refresh fails
      }

      res.json(config);
    } catch (error) {
      console.error("Error activating AWS config:", error);
      res.status(500).json({ message: "Failed to activate AWS configuration" });
    }
  });

  app.post("/api/aws-config/test", async (req, res) => {
    try {
      const { bucketName, region } = req.body;
      
      if (!bucketName) {
        return res.status(400).json({ message: "Bucket name is required" });
      }

      const s3Service = createAwsS3Service(region);
      const isConnected = await s3Service.testConnection(bucketName);
      
      if (isConnected) {
        // Update config with successful connection
        await storage.upsertAwsConfig({
          bucketName,
          region: region || "us-west-2",
          isConnected: true,
        });
      }

      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing AWS connection:", error);
      res.status(500).json({ message: "Failed to test AWS connection" });
    }
  });

  // Dataset endpoints with pagination and filtering
  app.get("/api/datasets", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { 
        page = "1", 
        limit = "50", 
        folder,
        search,
        format,
        tag
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 50;
      const offset = (pageNum - 1) * limitNum;
      
      console.log(`Request params - page: ${page}, limit: ${limit}`);
      console.log(`Parsed - pageNum: ${pageNum}, limitNum: ${limitNum}`);

      // Get datasets based on user's roles (cached with user ID and role)
      const cacheKey = `datasets-user-${req.user!.id}-role-${req.user!.role}`;
      let allDatasets = getCached<any[]>(cacheKey);
      
      if (!allDatasets) {
        console.log('Cache miss - loading datasets for user from storage');
        console.log(`User details: ID=${req.user!.id}, role=${req.user!.role}`);
        allDatasets = await storage.getDatasetsForUser(req.user!.id);
        console.log(`Datasets loaded for user ${req.user!.id}: ${allDatasets.length} datasets`);
        setCache(cacheKey, allDatasets, 300000); // 5 minutes cache
      } else {
        console.log(`Cache hit for user ${req.user!.id}: ${allDatasets.length} datasets`);
      }
      
      // Apply filters
      if (folder && folder !== "all") {
        console.log(`Filtering by folder: ${folder}`);
        console.log(`Datasets before filter: ${allDatasets.length}`);
        allDatasets = allDatasets.filter(d => d.topLevelFolder === folder);
        console.log(`Datasets after filter: ${allDatasets.length}`);
        if (allDatasets.length > 0) {
          console.log(`Sample dataset topLevelFolder: ${allDatasets[0].topLevelFolder}`);
          console.log(`Sample dataset names: ${allDatasets.slice(0, 3).map(d => d.name).join(', ')}`);
        }
      } else {
        console.log(`No folder filter applied, returning all ${allDatasets.length} datasets`);
        if (allDatasets.length > 0) {
          console.log(`Sample dataset names: ${allDatasets.slice(0, 3).map(d => d.name).join(', ')}`);
          // Check folder distribution
          const folderCounts = allDatasets.reduce((acc, d) => {
            acc[d.topLevelFolder] = (acc[d.topLevelFolder] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log(`Folder distribution:`, folderCounts);
        }
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        allDatasets = allDatasets.filter(d => 
          d.name.toLowerCase().includes(searchLower) ||
          (d.metadata as any)?.dataSource?.toLowerCase().includes(searchLower)
        );
      }
      
      if (format && format !== "all") {
        allDatasets = allDatasets.filter(d => d.format === format);
      }

      if (tag && tag !== "all") {
        const searchTag = (tag as string).toLowerCase();
        allDatasets = allDatasets.filter(d => {
          const metadata = d.metadata as any;
          return metadata && metadata.tags && Array.isArray(metadata.tags) &&
                 metadata.tags.some((t: string) => 
                   typeof t === 'string' && t.toLowerCase().includes(searchTag)
                 );
        });
      }

      const totalCount = allDatasets.length;
      const paginatedDatasets = allDatasets.slice(offset, offset + limitNum);

      // Set optimized cache headers for performance
      res.set({
        'Cache-Control': 'public, max-age=60', // 1 minute browser cache
        'ETag': `"datasets-${totalCount}-${pageNum}-${limitNum}"`,
      });

      res.json({
        datasets: paginatedDatasets,
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      });
    } catch (error) {
      console.error("Error fetching datasets:", error);
      res.status(500).json({ message: "Failed to fetch datasets" });
    }
  });

  // Optimized quick stats endpoint using precomputed cache
  app.get("/api/datasets/quick-stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cacheKey = `quick-stats-user-${req.user!.id}`;
      let stats = getCached<any>(cacheKey);
      
      if (!stats) {
        const datasets = await storage.getDatasetsForUser(req.user!.id);
        const folders = Array.from(new Set(datasets.map(d => d.topLevelFolder).filter(Boolean)));
        
        stats = {
          totalCount: datasets.length,
          folders,
          lastUpdated: new Date().toISOString()
        };
        
        setCache(cacheKey, stats, 300000); // 5 minutes cache
      }
      
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes browser cache
      res.json(stats);
    } catch (error) {
      console.error("Error fetching quick stats:", error);
      res.status(500).json({ message: "Failed to fetch quick stats" });
    }
  });

  // Preload endpoint for critical data
  app.get("/api/preload", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const [stats, folders, quickStats] = await Promise.all([
        getCached<any>(`precomputed-stats-user-${userId}`) || storage.getDatasetsForUser(userId).then(async datasets => {
          const totalSize = datasets.reduce((sum, dataset) => sum + Number(dataset.sizeBytes), 0);
          const uniqueDataSources = new Set();
          datasets.forEach(d => {
            if (d.metadata && (d.metadata as any).dataSource) {
              (d.metadata as any).dataSource
                .split(',')
                .map((s: string) => s.trim())
                .forEach((s: string) => uniqueDataSources.add(s));
            }
          });
          const lastRefreshTime = await storage.getLastRefreshTime();
          return {
            totalDatasets: datasets.length,
            totalSize: formatFileSize(totalSize),
            dataSources: uniqueDataSources.size,
            lastUpdated: lastRefreshTime ? getTimeAgo(lastRefreshTime) : "Never",
            lastRefreshTime: lastRefreshTime ? lastRefreshTime.toISOString() : null,
          };
        }),
        getCached<string[]>('folders') || storage.getDatasets().then(datasets => 
          Array.from(new Set(datasets.map(d => d.topLevelFolder).filter(Boolean)))
        ),
        getCached<any>('quick-stats') || { totalCount: 0, folders: [], lastUpdated: new Date().toISOString() }
      ]);

      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes browser cache
      res.json({
        stats,
        folders,
        quickStats,
        preloadTime: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error preloading data:", error);
      res.status(500).json({ message: "Failed to preload data" });
    }
  });

  app.post("/api/datasets/refresh", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found. Please configure S3 settings first." });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Test connection first
      const isConnected = await s3Service.testConnection(config.bucketName);
      if (!isConnected) {
        return res.status(400).json({ message: "Cannot connect to S3 bucket. Please check your AWS configuration." });
      }

      // Fetch datasets from S3
      const s3Datasets = await s3Service.listDatasets(config.bucketName);
      
      // Upsert datasets (update existing or create new) to preserve IDs and insights
      const upsertedDatasets = [];
      for (const datasetData of s3Datasets) {
        const dataset = await storage.upsertDataset(datasetData);
        upsertedDatasets.push(dataset);
      }

      // Remove datasets that no longer exist in S3
      const existingDatasets = await storage.getDatasets();
      const s3DatasetNames = new Set(s3Datasets.map(d => `${d.name}|${d.source}`));
      
      for (const existing of existingDatasets) {
        const existingKey = `${existing.name}|${existing.source}`;
        if (!s3DatasetNames.has(existingKey)) {
          await storage.deleteDataset(existing.id);
        }
      }

      // Log the refresh with timestamp
      await storage.logRefresh(upsertedDatasets.length);

      // Clear cache after refresh
      invalidateCache();

      res.json({ 
        message: `Successfully refreshed ${upsertedDatasets.length} datasets`,
        datasets: upsertedDatasets 
      });
    } catch (error) {
      console.error("Error refreshing datasets:", error);
      res.status(500).json({ message: "Failed to refresh datasets from S3" });
    }
  });

  app.get("/api/datasets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dataset ID" });
      }
      
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      res.json(dataset);
    } catch (error) {
      console.error("Error fetching dataset:", error);
      res.status(500).json({ message: "Failed to fetch dataset" });
    }
  });

  // AI Insights endpoints
  app.post("/api/datasets/:id/insights", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const insights = await openAIService.generateDatasetInsights(dataset);
      
      // Update dataset with insights
      await storage.updateDataset(id, { insights });
      
      res.json({ insights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  // Dataset download endpoint
  app.get("/api/datasets/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }
      
      const awsConfig = await storage.getAwsConfig();
      if (!awsConfig) {
        return res.status(400).json({ error: "AWS configuration not found" });
      }
      
      const awsService = createAwsS3Service(awsConfig.region);
      const downloadUrl = await awsService.generateSampleDownloadUrl(
        awsConfig.bucketName, 
        dataset.source, 
        dataset.name
      );
      
      if (!downloadUrl) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Handle the download object which contains key, bucketName, and sampleSize
      if (typeof downloadUrl === 'object' && downloadUrl !== null) {
        return res.status(501).json({ error: "Direct download not implemented. Use sample download endpoint instead." });
      }
      
      // Redirect to the presigned URL for download
      res.redirect(downloadUrl);
    } catch (error) {
      console.error("Error downloading dataset:", error);
      res.status(500).json({ error: "Failed to download dataset" });
    }
  });

  // Enhanced dataset chat endpoint with file access and visualization
  app.post("/api/datasets/:id/chat", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { message, conversationHistory, enableVisualization } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const dataset = await storage.getDataset(id);
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const response = await openAIService.chatWithDatasetEnhanced(
        dataset, 
        message, 
        conversationHistory || [], 
        enableVisualization || false
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error in dataset chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Batch dataset chat endpoint for multi-dataset analysis
  app.post("/api/datasets/batch-chat", async (req, res) => {
    try {
      const { message, datasetIds, conversationHistory, enableVisualization } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      if (!datasetIds || !Array.isArray(datasetIds) || datasetIds.length === 0) {
        return res.status(400).json({ message: "Dataset IDs are required" });
      }

      // Fetch all datasets
      const datasets = await Promise.all(
        datasetIds.map(async (id: number) => {
          const dataset = await storage.getDataset(id);
          if (!dataset) {
            throw new Error(`Dataset with ID ${id} not found`);
          }
          return dataset;
        })
      );

      const response = await openAIService.chatWithMultipleDatasets(
        datasets, 
        message, 
        conversationHistory || [], 
        enableVisualization || false
      );
      
      res.json(response);
    } catch (error) {
      console.error("Error in batch dataset chat:", error);
      res.status(500).json({ message: "Failed to process batch chat message" });
    }
  });

  // Find datasets by query
  app.post("/api/datasets/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }
      
      console.log('Starting search for:', query);
      const datasets = await storage.getDatasets();
      console.log('Found datasets:', datasets.length);
      
      // Use fallback search primarily with AI search as enhancement
      console.log('Running fallback search...');
      const fallbackResults = openAIService.fallbackSearch(query, datasets);
      console.log('Fallback results:', fallbackResults.length);
      
      // Return results immediately to avoid timeouts
      res.json({ results: fallbackResults });
      
    } catch (error) {
      console.error("Error in dataset search:", error);
      res.status(500).json({ error: "Failed to search datasets" });
    }
  });

  app.post("/api/datasets/bulk-insights", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      
      if (datasets.length === 0) {
        return res.json({ message: "No datasets found" });
      }

      const insights = await openAIService.generateBulkInsights(datasets);
      
      // Update datasets with insights
      const updatePromises = Object.entries(insights).map(([datasetId, datasetInsights]) => 
        storage.updateDataset(parseInt(datasetId), { insights: datasetInsights })
      );
      
      await Promise.all(updatePromises);
      
      res.json({ 
        message: `Generated insights for ${Object.keys(insights).length} datasets`,
        insights 
      });
    } catch (error) {
      console.error("Error generating bulk insights:", error);
      res.status(500).json({ message: "Failed to generate bulk AI insights" });
    }
  });

  // Download sample endpoint
  app.get("/api/datasets/:id/download-sample", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found" });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Get sample file info from the dataset
      const sampleInfo = await s3Service.generateSampleDownloadUrl(config.bucketName, dataset.source, dataset.name);
      
      if (!sampleInfo) {
        return res.status(404).json({ message: "No sample file found for this dataset" });
      }

      // Download the partial file content
      const partialContent = await s3Service.downloadPartialFile(sampleInfo.bucketName, sampleInfo.key, sampleInfo.sampleSize);
      
      if (!partialContent) {
        return res.status(500).json({ message: "Failed to download sample content" });
      }

      // Record the download
      await storage.recordDownload(
        id, 
        'sample', 
        req.ip || req.connection.remoteAddress, 
        req.get('User-Agent')
      );

      // Invalidate download stats cache
      invalidateCache(`download-stats-${id}`);

      // Set appropriate headers for file download
      const fileName = `${dataset.name}-sample.${dataset.format.toLowerCase()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', partialContent.length);
      
      // Send the partial file content
      res.send(partialContent);
    } catch (error) {
      console.error("Error generating download sample:", error);
      res.status(500).json({ message: "Failed to generate sample download" });
    }
  });

  // Download full file endpoint
  app.get("/api/datasets/:id/download-full", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found" });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Get full file stream from S3
      const fileInfo = await s3Service.downloadFullFile(config.bucketName, dataset.source, dataset.name);
      
      if (!fileInfo) {
        return res.status(404).json({ message: "File not found or failed to download" });
      }

      // Record the download
      await storage.recordDownload(
        id, 
        'full', 
        req.ip || req.connection.remoteAddress, 
        req.get('User-Agent')
      );

      // Invalidate download stats cache
      invalidateCache(`download-stats-${id}`);

      // Set appropriate headers for file download
      const fileName = `${dataset.name}.${dataset.format.toLowerCase()}`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Set content length if available
      if (fileInfo.size) {
        res.setHeader('Content-Length', fileInfo.size);
      }
      
      // Pipe the stream directly to the response to avoid memory issues
      const stream = fileInfo.stream as any;
      stream.pipe(res);
      
      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error('Stream error during download:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to download full file" });
        }
      });
      
    } catch (error) {
      console.error("Error downloading full file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download full file" });
      }
    }
  });

  // Download metadata file endpoint
  app.get("/api/datasets/:id/download-metadata", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }

      const config = await storage.getAwsConfig();
      
      if (!config || !config.bucketName) {
        return res.status(400).json({ message: "AWS configuration not found" });
      }

      const s3Service = createAwsS3Service(config.region);
      
      // Get metadata file stream from S3
      const fileInfo = await s3Service.downloadMetadataFile(config.bucketName, dataset.source, dataset.name);
      
      if (!fileInfo) {
        console.log(`No metadata file found for dataset ${dataset.name} in ${dataset.source}`);
        return res.status(404).json({ 
          message: "No YAML metadata file found for this dataset",
          details: `Searched in folder: ${dataset.source}` 
        });
      }

      // Record the download
      await storage.recordDownload(
        id, 
        'metadata', 
        req.ip || req.connection.remoteAddress, 
        req.get('User-Agent')
      );

      // Invalidate download stats cache
      invalidateCache(`download-stats-${id}`);

      // Set appropriate headers for file download
      const fileName = `${dataset.name}.yaml`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/x-yaml');
      
      // Set content length if available
      if (fileInfo.size) {
        res.setHeader('Content-Length', fileInfo.size);
      }
      
      // Pipe the stream directly to the response to avoid memory issues
      const stream = fileInfo.stream as any;
      stream.pipe(res);
      
      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error('Stream error during metadata download:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to download metadata file" });
        }
      });
      
    } catch (error) {
      console.error("Error downloading metadata file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download metadata file" });
      }
    }
  });

  // Get download statistics for a dataset
  app.get("/api/datasets/:id/download-stats", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid dataset ID" });
      }
      
      const stats = await storage.getDownloadStats(id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching download stats:", error);
      res.status(500).json({ message: "Failed to fetch download statistics" });
    }
  });

  // Get download statistics for multiple datasets
  app.post("/api/datasets/batch-download-stats", async (req, res) => {
    try {
      const { datasetIds } = req.body;
      
      if (!Array.isArray(datasetIds)) {
        return res.status(400).json({ message: "datasetIds must be an array" });
      }
      
      const cacheKey = `batch-download-stats-${datasetIds.sort().join(',')}`;
      let batchStats = getCached<Record<number, any>>(cacheKey);
      
      if (!batchStats) {
        batchStats = await storage.getBatchDownloadStats(datasetIds);
        setCache(cacheKey, batchStats, 300000); // 5 minute cache
      }
      
      res.json(batchStats);
    } catch (error) {
      console.error("Error fetching batch download stats:", error);
      res.status(500).json({ message: "Failed to fetch batch download statistics" });
    }
  });

  // Get community data points calculation
  app.get("/api/community-data-points", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      const results = datasets
        .filter(d => {
          const metadata = d.metadata as any;
          return metadata && 
                 metadata.recordCount && 
                 metadata.columnCount && 
                 metadata.completenessScore;
        })
        .map(d => {
          const metadata = d.metadata as any;
          const recordCount = parseInt(metadata.recordCount);
          const columnCount = metadata.columnCount;
          const completenessScore = metadata.completenessScore / 100.0; // Convert percentage to decimal
          
          return {
            file_name: d.name,
            record_count: recordCount,
            column_count: columnCount,
            completeness_score: completenessScore,
            community_data_points: recordCount * columnCount * completenessScore
          };
        });
      
      res.json(results);
    } catch (error) {
      console.error("Error calculating community data points:", error);
      res.status(500).json({ message: "Failed to calculate community data points" });
    }
  });

  // Get community data points by folder
  app.get("/api/folders/community-data-points", async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      const folderTotals = new Map<string, number>();
      
      // Calculate community data points for each dataset and group by folder
      datasets
        .filter(d => {
          const metadata = d.metadata as any;
          return metadata && 
                 metadata.recordCount && 
                 metadata.columnCount && 
                 metadata.completenessScore &&
                 d.topLevelFolder;
        })
        .forEach(d => {
          const metadata = d.metadata as any;
          const recordCount = parseInt(metadata.recordCount);
          const columnCount = metadata.columnCount;
          const completenessScore = metadata.completenessScore / 100.0;
          const communityDataPoints = recordCount * columnCount * completenessScore;
          
          const currentTotal = folderTotals.get(d.topLevelFolder!) || 0;
          folderTotals.set(d.topLevelFolder!, currentTotal + communityDataPoints);
        });
      
      // Format results with folder labels
      const results = Array.from(folderTotals.entries()).map(([folderName, total]) => ({
        folder_label: `${folderName.toUpperCase().replace(/_/g, ' ')}(${Math.round(total).toLocaleString()})`,
        total_community_data_points: Math.round(total)
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error calculating folder community data points:", error);
      res.status(500).json({ message: "Failed to calculate folder community data points" });
    }
  });

  // Get unique top-level folders (optionally filtered by tag)
  app.get("/api/folders", async (req, res) => {
    try {
      const { tag } = req.query;
      let datasets = await storage.getDatasets();
      
      // If tag filter is provided, only include folders that contain datasets with that tag
      if (tag && tag !== 'all') {
        const foldersWithTag = new Set<string>();
        
        datasets.forEach(dataset => {
          const metadata = dataset.metadata as any;
          if (metadata && metadata.tags && Array.isArray(metadata.tags)) {
            const hasTag = metadata.tags.some((t: string) => 
              typeof t === 'string' && t.trim().toLowerCase() === (tag as string).toLowerCase()
            );
            if (hasTag && dataset.topLevelFolder) {
              foldersWithTag.add(dataset.topLevelFolder);
            }
          }
        });
        
        const folders = Array.from(foldersWithTag).sort();
        console.log(`Filtering folders by tag "${tag}": found ${folders.length} folders with that tag`);
        res.json(folders);
      } else {
        // Return all folders
        const folders = Array.from(new Set(datasets
          .map(d => d.topLevelFolder)
          .filter(Boolean)))
          .sort();
        
        res.json(folders);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  // Get tag frequencies for filtering (always global, not folder-scoped)
  app.get("/api/tags", async (req, res) => {
    try {
      const cacheKey = 'tag-frequencies-global';
      
      const cached = getCached<Array<{tag: string, count: number}>>(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const datasets = await storage.getDatasets();
      const tagCounts = new Map<string, number>();

      // Extract tags from each dataset's metadata across all folders
      datasets.forEach(dataset => {
        const metadata = dataset.metadata as any;
        if (metadata && metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags.forEach((tag: string) => {
            if (typeof tag === 'string' && tag.trim()) {
              const normalizedTag = tag.trim().toLowerCase();
              tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
            }
          });
        }
      });

      // Convert to array and sort by frequency (descending)
      const tagFrequencies = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      console.log(`Found ${tagFrequencies.length} unique tags across entire data lake`);
      
      setCache(cacheKey, tagFrequencies, 600000); // Cache for 10 minutes
      res.json(tagFrequencies);
    } catch (error) {
      console.error("Error getting tag frequencies:", error);
      res.status(500).json({ message: "Failed to get tag frequencies" });
    }
  });

  // Helper function to extract unique data sources from metadata
  const extractDataSources = (datasets: any[]): Set<string> => {
    const sources = new Set<string>();
    
    for (const dataset of datasets) {
      if (dataset.metadata && dataset.metadata.dataSource) {
        // Split by comma and clean up each source
        const dataSources = dataset.metadata.dataSource
          .split(',')
          .map((source: string) => source.trim())
          .filter((source: string) => source.length > 0);
        
        dataSources.forEach((source: string) => sources.add(source));
      }
    }
    
    return sources;
  };

  // Optimized stats endpoint with caching
  let statsCache: { data: any; timestamp: number } | null = null;
  const STATS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  app.get("/api/stats", async (req, res) => {
    try {
      // Use precomputed stats from cache for maximum performance
      let stats = getCached<any>('precomputed-stats');
      
      if (stats) {
        res.set('Cache-Control', 'public, max-age=1800'); // 30 minutes browser cache
        return res.json(stats);
      }

      // Fallback to legacy cache check
      if (statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_DURATION) {
        return res.json(statsCache.data);
      }

      const datasets = await storage.getDatasets();
      
      const totalSize = datasets.reduce((sum, dataset) => sum + Number(dataset.sizeBytes), 0);
      const uniqueDataSources = extractDataSources(datasets);
      
      // Calculate total community data points across all datasets
      const totalCommunityDataPoints = datasets
        .filter(d => {
          const metadata = d.metadata as any;
          return metadata && 
                 metadata.recordCount && 
                 metadata.columnCount && 
                 metadata.completenessScore;
        })
        .reduce((total, d) => {
          const metadata = d.metadata as any;
          const recordCount = parseInt(metadata.recordCount);
          const columnCount = metadata.columnCount;
          const completenessScore = metadata.completenessScore / 100.0;
          return total + (recordCount * columnCount * completenessScore);
        }, 0);
      
      // Use the last refresh time instead of dataset modification times
      const lastRefreshTime = await storage.getLastRefreshTime();

      stats = {
        totalDatasets: datasets.length,
        totalSize: formatFileSize(totalSize),
        dataSources: uniqueDataSources.size,
        lastUpdated: lastRefreshTime ? getTimeAgo(lastRefreshTime) : "Never",
        lastRefreshTime: lastRefreshTime ? lastRefreshTime.toISOString() : null,
        totalCommunityDataPoints: Math.round(totalCommunityDataPoints),
      };

      // Cache the results
      statsCache = {
        data: stats,
        timestamp: Date.now()
      };
      
      setCache('precomputed-stats', stats, 1800000); // 30 minutes

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Documentation endpoint - serve API docs from replit.md
  app.get("/api/docs/markdown", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Read the replit.md file
      const filePath = path.join(process.cwd(), 'replit.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract only the API Documentation section
      const apiDocsStart = content.indexOf('## API Documentation');
      if (apiDocsStart === -1) {
        return res.status(404).json({ message: "API Documentation section not found" });
      }
      
      // Find the next major section to stop at
      const nextSectionIndex = content.indexOf('\n## ', apiDocsStart + 1);
      const apiDocsContent = nextSectionIndex !== -1 
        ? content.substring(apiDocsStart, nextSectionIndex)
        : content.substring(apiDocsStart);
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(apiDocsContent);
    } catch (error) {
      console.error("Error reading API documentation:", error);
      res.status(500).json({ message: "Failed to load API documentation" });
    }
  });

  // Performance monitoring endpoint
  app.get("/api/performance/stats", async (req, res) => {
    try {
      const { performanceMonitor } = await import("./lib/performance-monitor");
      const stats = performanceMonitor.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching performance stats:", error);
      res.status(500).json({ message: "Failed to fetch performance statistics" });
    }
  });

  // Database optimization status endpoint
  app.get("/api/performance/db-status", async (req, res) => {
    try {
      // Check if indexes exist by querying information_schema
      const indexInfo = await storage.query(`
        SELECT 
          indexname,
          tablename,
          schemaname
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('datasets', 'aws_config', 'refresh_log')
        ORDER BY tablename, indexname;
      `);

      const optimizationStatus = {
        indexesCreated: indexInfo.length > 3, // More than just primary keys
        compressionEnabled: true,
        cachingEnabled: true,
        performanceMonitoring: true,
        indexes: indexInfo,
        recommendations: []
      };

      // Add recommendations based on performance data
      const { performanceMonitor } = await import("./lib/performance-monitor");
      const slowQueries = performanceMonitor.getSlowQueries(1000);
      
      if (slowQueries.length > 5) {
        optimizationStatus.recommendations.push("Consider adding more specific indexes for slow queries");
      }

      const cacheHitRate = performanceMonitor.getCacheHitRate();
      if (cacheHitRate < 80) {
        optimizationStatus.recommendations.push("Consider increasing cache TTL for better performance");
      }

      res.json(optimizationStatus);
    } catch (error) {
      console.error("Error checking database optimization status:", error);
      res.status(500).json({ message: "Failed to check optimization status" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize cache warming
  setTimeout(warmCache, 5000); // Warm cache 5 seconds after server start
  
  return httpServer;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
