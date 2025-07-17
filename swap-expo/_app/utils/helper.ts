/**
 * Helper utility functions for the app
 */

/**
 * Format a currency value with the specified symbol
 * @param amount Number to format
 * @param symbol Currency symbol to use
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, symbol: string = '€'): string => {
  return `${amount.toFixed(2)} ${symbol}`;
};

/**
 * Generate a relative date string (Today, Yesterday, or date)
 * @param date Date to format
 * @returns Formatted date string
 */
export const getRelativeDateStr = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
  }
};

/**
 * Generate initials from a name
 * @param name Name to extract initials from
 * @returns 1-2 character string with initials
 */
export const getInitials = (name: string): string => {
  if (!name) return 'UU';
  
  const parts = name.split(' ');
  if (parts.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate a consistent avatar color based on name
 * @param name Name to use for color generation
 * @returns Hex color code
 */
export const generateAvatarColor = (name: string): string => {
  // List of pleasant colors for avatars
  const colors = [
    "#6495ED", // Cornflower Blue
    "#ff7f50", // Coral
    "#FF6B6B", // Pastel Red
    "#4ecdc4", // Turquoise
    "#ffd166", // Mustard
    "#9370db", // Medium Purple
    "#87ceeb", // Sky Blue
    "#8470ff", // Light Slate Blue
    "#ffa500", // Orange
    "#5cb85c", // Bootstrap Green
  ];
  
  // Simple hash of name to pick a color
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  
  return colors[sum % colors.length];
}; 