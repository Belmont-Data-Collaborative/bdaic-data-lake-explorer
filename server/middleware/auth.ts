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
  console.log(`AUTH MIDDLEWARE: ${req.method} ${req.url}`);
  console.log('AUTH MIDDLEWARE: Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('AUTH MIDDLEWARE: No token provided');
    return res.status(401).json({ message: "Access token required" });
  }

  const decoded = storage.verifyJWT(token);
  if (!decoded) {
    console.log('AUTH MIDDLEWARE: Invalid/expired token');
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  // Check if user still exists and is active
  const user = await storage.getUserById(decoded.id);
  if (!user || !user.isActive) {
    console.log('AUTH MIDDLEWARE: User inactive or not found');
    return res.status(403).json({ message: "User account is inactive" });
  }

  console.log(`AUTH MIDDLEWARE: User ${decoded.username} authenticated successfully`);
  req.user = decoded;
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