import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  ttfb: number; // Time to First Byte
  domContentLoaded: number;
  networkRequests: number;
  cacheHitRate: number;
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [startTime] = useState(performance.now());

  useEffect(() => {
    // Monitor page load performance
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      
      // Calculate cache hit rate
      const cacheHits = resources.filter(resource => 
        resource.transferSize === 0 && resource.decodedBodySize > 0
      ).length;
      const cacheHitRate = resources.length > 0 ? (cacheHits / resources.length) * 100 : 0;

      const performanceMetrics: PerformanceMetrics = {
        loadTime: performance.now() - startTime,
        ttfb: navigation.responseStart - navigation.requestStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        networkRequests: resources.length,
        cacheHitRate,
      };

      setMetrics(performanceMetrics);

      // Log performance to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚀 Performance Metrics');
        console.log(`Load Time: ${performanceMetrics.loadTime.toFixed(2)}ms`);
        console.log(`TTFB: ${performanceMetrics.ttfb.toFixed(2)}ms`);
        console.log(`DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
        console.log(`Network Requests: ${performanceMetrics.networkRequests}`);
        console.log(`Cache Hit Rate: ${performanceMetrics.cacheHitRate.toFixed(1)}%`);
        console.groupEnd();

        // Alert if load time exceeds target
        if (performanceMetrics.loadTime > 2000) {
          console.warn(`⚠️ Slow load detected: ${performanceMetrics.loadTime.toFixed(2)}ms (target: <2000ms)`);
        } else {
          console.log(`✅ Fast load achieved: ${performanceMetrics.loadTime.toFixed(2)}ms`);
        }
      }
    };

    // Measure after DOM is fully loaded
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, [startTime]);

  return metrics;
}