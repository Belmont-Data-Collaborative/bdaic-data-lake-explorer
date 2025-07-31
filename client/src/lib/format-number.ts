/**
 * Formats a number with magnitude abbreviations.
 * Numbers below 1,000,000 show as full numbers.
 * Numbers 1,000,000 and above show with abbreviated forms.
 * 
 * Examples:
 * 100,000 -> "100,000"
 * 1,000,000 -> "1M"
 * 1,500,000 -> "1.5M"
 * 539,000,000 -> "539M"
 * 5,100,000,000 -> "5.1B"
 * 1,200,000,000,000 -> "1.2T"
 */
export function formatNumber(num: number): string {
  if (num < 1000000) {
    // Numbers below 1 million show as full numbers with commas
    return num.toLocaleString();
  }

  const units = [
    { value: 1e12, symbol: 'T' }, // Trillion
    { value: 1e9, symbol: 'B' },  // Billion
    { value: 1e6, symbol: 'M' },  // Million
  ];

  for (const unit of units) {
    if (num >= unit.value) {
      const value = num / unit.value;
      
      // If it's a whole number, don't show decimals
      if (value % 1 === 0) {
        return `${value}${unit.symbol}`;
      }
      
      // Show up to 1 decimal place, but remove trailing zeros
      const formatted = (Math.round(value * 10) / 10).toString();
      return `${formatted}${unit.symbol}`;
    }
  }

  // Fallback (should never reach here given the conditions above)
  return num.toLocaleString();
}