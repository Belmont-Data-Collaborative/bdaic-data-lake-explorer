import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats large numbers with appropriate suffixes (K, M, B, T)
 * Numbers below 1,000,000 are displayed as-is
 * Numbers 1,000,000+ are formatted with leading digits and suffix
 * 
 * Examples:
 * 100,000 -> "100,000"
 * 1,000,000 -> "1M"
 * 5,100,000,000 -> "5.1B" 
 * 539,000,000 -> "539M"
 */
export function formatNumber(num: number): string {
  if (num < 1000000) {
    // Numbers below 1 million - show full number with commas
    return num.toLocaleString();
  }

  const suffixes = [
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
  ];

  for (const { value, suffix } of suffixes) {
    if (num >= value) {
      const formatted = num / value;
      // Show 1 decimal place if it's not a whole number
      if (formatted % 1 === 0) {
        return `${formatted.toFixed(0)}${suffix}`;
      } else {
        return `${formatted.toFixed(1)}${suffix}`;
      }
    }
  }

  return num.toLocaleString();
}
