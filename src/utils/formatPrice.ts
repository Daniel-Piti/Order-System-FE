/**
 * Formats a price number with thousand separators and currency symbol
 * @param price - The price number to format
 * @returns Formatted string with ₪ symbol and thousand separators (e.g., ₪1,000.00)
 */
export const formatPrice = (price: number): string => {
  // Format number with thousand separators and 2 decimal places
  const formattedNumber = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₪${formattedNumber}`;
};

/**
 * Negative amount as ₪−1,234.56 (minus after the currency symbol; pair with dir="ltr" in RTL UI).
 */
export function formatPriceNegative(amount: number): string {
  const abs = Math.abs(amount);
  const formattedNumber = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₪−${formattedNumber}`;
}

