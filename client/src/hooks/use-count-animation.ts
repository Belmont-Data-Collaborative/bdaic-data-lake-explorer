import { useState, useEffect, useRef } from 'react';

interface UseCountAnimationOptions {
  /** Target value to animate to */
  target: number;
  /** Duration of animation in milliseconds */
  duration?: number;
  /** Delay before starting animation in milliseconds */
  delay?: number;
  /** Whether to respect prefers-reduced-motion */
  respectMotionPreference?: boolean;
  /** Custom easing function */
  easing?: (t: number) => number;
}

// Easing function for smooth animation (easeOutQuart)
const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4);
};

export function useCountAnimation({
  target,
  duration = 1500,
  delay = 0,
  respectMotionPreference = true,
  easing = easeOutQuart,
}: UseCountAnimationOptions) {
  const [currentValue, setCurrentValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef<number>(0);

  // Check for reduced motion preference
  const prefersReducedMotion = respectMotionPreference && 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // If reduced motion is preferred or target is 0, set immediately
    if (prefersReducedMotion || target === 0) {
      setCurrentValue(target);
      setIsAnimating(false);
      return;
    }

    // Start animation after delay
    const timeoutId = setTimeout(() => {
      setIsAnimating(true);
      startTimeRef.current = performance.now();
      startValueRef.current = currentValue;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return;

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        const easedProgress = easing(progress);
        const newValue = startValueRef.current + (target - startValueRef.current) * easedProgress;
        
        setCurrentValue(Math.round(newValue));

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentValue(target);
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }, delay);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsAnimating(false);
    };
  }, [target, duration, delay, prefersReducedMotion, easing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    value: currentValue,
    isAnimating,
  };
}

// Hook for animating multiple values with staggered timing
export function useStaggeredCountAnimation(
  targets: number[],
  baseDuration: number = 1500,
  staggerDelay: number = 200
) {
  return targets.map((target, index) => 
    useCountAnimation({
      target,
      duration: baseDuration + (index * 100), // Slightly different durations
      delay: index * staggerDelay, // Staggered start times
    })
  );
}