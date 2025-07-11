// Date formatting utilities for the application

/**
 * Format a date to a human-readable string
 * @param date The date to format
 * @returns Formatted date string like "Mar 23, 2025"
 */
export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Format a date to show only the time portion
 * @param date The date to format
 * @returns Formatted time string like "14:30"
 */
export const formatTime = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  };
  
  return date.toLocaleTimeString('en-US', options);
};

/**
 * Format a date to show the relative time (e.g. "2 hours ago")
 * @param date The date to format
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  // For older dates, return the formatted date
  return formatDate(date);
};

/**
 * Format a date for transaction listings
 * @param date The date to format
 * @returns Formatted date string appropriate for transactions
 */
export const formatTransactionDate = (date: Date): string => {
  const now = new Date();
  
  // Check if the date is today
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  
  // Check if the date is yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // For dates within the past week, show the day name
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffInDays < 7) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return date.toLocaleDateString('en-US', options);
  }
  
  // For other dates, show the full date
  return formatDate(date);
}; 