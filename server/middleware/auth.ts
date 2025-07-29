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
    return res.status(401).json({ message: "Access token required" });
  }

  const decoded = storage.verifyJWT(token);
  if (!decoded) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  // Check if user still exists and is active
  const user = await storage.getUserById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(403).json({ message: "User account is inactive" });
  }

  req.user = {
    id: decoded.id,
    username: decoded.username,
    role: decoded.systemRole || decoded.role || 'user' // Map systemRole to role for consistency
  };
  
  console.log(`🔐 AUTH DEBUG: JWT decoded for user ${decoded.id} (${decoded.username}) with systemRole: ${decoded.systemRole}`);
  console.log(`🔐 AUTH DEBUG: Request user set to:`, req.user);
  
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