import { useState, useEffect } from "react";

export function useDynamicTime(timestamp: string | null) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!timestamp) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [timestamp]);

  const formatTimeAgo = (timestamp: string | null): string => {
    if (!timestamp) return "Never";

    const now = currentTime;
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // First hour: show minutes
    if (diffMinutes < 60) {
      return diffMinutes === 0 ? "Just now" : `${diffMinutes}m ago`;
    }

    // First 24 hours: show hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // After 24 hours: show date
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: diffDays > 365 ? "numeric" : undefined,
    };
    
    return then.toLocaleDateString("en-US", options);
  };

  return formatTimeAgo(timestamp);
}