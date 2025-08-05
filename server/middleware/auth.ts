import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Simple session-based authentication middleware 
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    console.log(`Auth failed: No session ID provided for ${req.method} ${req.path}`);
    return res.status(401).json({ message: "Session required" });
  }

  // Extract user ID from session ID (simple approach)
  const userIdMatch = sessionId.match(/session_(\d+)_/);
  if (!userIdMatch) {
    console.log(`Auth failed: Invalid session format for ${req.method} ${req.path}`);
    return res.status(403).json({ message: "Invalid session" });
  }

  const userId = parseInt(userIdMatch[1]);
  const user = await storage.getUserById(userId);
  
  if (!user || !user.isActive) {
    console.log(`Auth failed: User ${userId} not found or inactive for ${req.method} ${req.path}`);
    return res.status(403).json({ message: "User not found or inactive" });
  }

  console.log(`Auth success: User ${userId} (${user.role}) accessing ${req.method} ${req.path}`);
  
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