import { Request, Response, NextFunction } from "express";

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: Date;
  statusCode: number;
  responseSize?: number;
  cacheHit?: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getSlowQueries(threshold: number = 1000) {
    return this.metrics.filter(metric => metric.duration > threshold);
  }

  getAverageResponseTime(endpoint?: string) {
    const filteredMetrics = endpoint 
      ? this.metrics.filter(m => m.endpoint.includes(endpoint))
      : this.metrics;
    
    if (filteredMetrics.length === 0) return 0;
    
    const total = filteredMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return Math.round(total / filteredMetrics.length);
  }

  getCacheHitRate() {
    const cacheableRequests = this.metrics.filter(m => m.cacheHit !== undefined);
    if (cacheableRequests.length === 0) return 0;
    
    const hits = cacheableRequests.filter(m => m.cacheHit).length;
    return Math.round((hits / cacheableRequests.length) * 100);
  }

  getStats() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);

    return {
      totalRequests: this.metrics.length,
      recentRequests: recentMetrics.length,
      averageResponseTime: this.getAverageResponseTime(),
      slowQueries: this.getSlowQueries().length,
      cacheHitRate: this.getCacheHitRate(),
      endpointStats: this.getEndpointStats(),
    };
  }

  private getEndpointStats() {
    const stats = new Map<string, { count: number; avgTime: number; slowest: number }>();
    
    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = stats.get(key) || { count: 0, avgTime: 0, slowest: 0 };
      
      existing.count++;
      existing.avgTime = ((existing.avgTime * (existing.count - 1)) + metric.duration) / existing.count;
      existing.slowest = Math.max(existing.slowest, metric.duration);
      
      stats.set(key, existing);
    });

    return Object.fromEntries(stats);
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function performanceMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const originalSend = res.send;
    let responseSize = 0;

    res.send = function(body: any) {
      if (body) {
        responseSize = JSON.stringify(body).length;
      }
      return originalSend.call(this, body);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Only track API endpoints
      if (req.path.startsWith('/api')) {
        performanceMonitor.addMetric({
          endpoint: req.path,
          method: req.method,
          duration,
          timestamp: new Date(),
          statusCode: res.statusCode,
          responseSize,
          cacheHit: res.getHeader('X-Cache-Hit') === 'true'
        });

        // Log slow queries
        if (duration > 2000) {
          console.warn(`Slow query detected: ${req.method} ${req.path} took ${duration}ms`);
        }
      }
    });

    next();
  };
}