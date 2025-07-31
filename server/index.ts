import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performanceMiddleware } from "./lib/performance-monitor";

const app = express();

// Enable HTTP compression with optimized settings for API responses
app.use(compression({
  // Compress responses above 1KB
  threshold: 1024,
  // Use highest compression level for better results
  level: 9,
  // Compress all MIME types that benefit from compression
  filter: (req: Request, res: Response) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // fallback to standard filter function
    return compression.filter(req, res);
  },
  // Use default compression strategy
  strategy: 0, // Z_DEFAULT_STRATEGY
}));

// Add cache headers for static assets
app.use((req, res, next) => {
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.set('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add performance monitoring middleware
app.use(performanceMiddleware());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3000 (changed from 5000 due to macOS Control Center conflict)
  // this serves both the API and the client.
  const port = 3000;
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
