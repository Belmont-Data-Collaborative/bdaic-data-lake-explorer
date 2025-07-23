import { useEffect, useRef } from 'react';

interface FocusTrapOptions {
  isActive: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

export function useFocusTrap(options: FocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!options.isActive || !containerRef.current) return;

    const container = containerRef.current;
    
    // Store the previously focused element
    if (options.restoreFocus !== false) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[role="button"]:not([disabled])',
        '[role="link"]:not([disabled])',
      ].join(', ');
      
      return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: go to previous element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: go to next element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Auto-focus first element if requested
    if (options.autoFocus !== false) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
      }
    }

    // Add event listener
    container.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to previously active element
      if (options.restoreFocus !== false && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [options.isActive, options.restoreFocus, options.autoFocus]);

  return containerRef;
}