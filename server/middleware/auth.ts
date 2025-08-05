import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Middleware to verify JWT token
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log(`Auth failed: No token provided for ${req.method} ${req.path}`);
    return res.status(401).json({ message: "Access token required" });
  }

  console.log(`Auth middleware: Verifying token for ${req.method} ${req.path}`);
  console.log(`Auth middleware: Token (first 50 chars): ${token.substring(0, 50)}...`);
  
  const decoded = storage.verifyJWT(token);
  if (!decoded) {
    console.log(`Auth failed: Invalid token for ${req.method} ${req.path}`);
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  console.log(`Auth middleware: JWT decoded to user ID=${decoded.id}, username="${decoded.username}", role="${decoded.role}"`);

  // Check if user still exists and is active
  console.log(`Auth middleware: Looking up user ID ${decoded.id} in database...`);
  const user = await storage.getUserById(decoded.id);
  
  if (!user) {
    console.log(`Auth failed: User ${decoded.id} not found in database for ${req.method} ${req.path}`);
    return res.status(403).json({ message: "User not found" });
  }
  
  if (!user.isActive) {
    console.log(`Auth failed: User ${decoded.id} inactive for ${req.method} ${req.path}`);
    return res.status(403).json({ message: "User account is inactive" });
  }

  console.log(`Auth middleware: Database user lookup returned ID=${user.id}, username="${user.username}", role="${user.role}"`);
  
  // CRITICAL: Check for user data consistency between JWT and database
  if (user.id !== decoded.id || user.username !== decoded.username || user.role !== decoded.role) {
    console.log(`Auth middleware: CRITICAL ERROR - User data mismatch!`);
    console.log(`Auth middleware: JWT says user ID=${decoded.id}, username="${decoded.username}", role="${decoded.role}"`);
    console.log(`Auth middleware: Database says user ID=${user.id}, username="${user.username}", role="${user.role}"`);
    return res.status(403).json({ message: "Authentication data inconsistency detected" });
  }

  console.log(`Auth success: User ${decoded.id} (${decoded.role}) accessing ${req.method} ${req.path}`);
  
  // Use the database user data to ensure consistency
  req.user = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  next();
};

// Middleware to check user role
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
};

// Convenience middlewares for common roles
export const requireAdmin = authorizeRole(['admin']);
export const requireUser = authorizeRole(['user', 'admin']); // Both user and admin can access