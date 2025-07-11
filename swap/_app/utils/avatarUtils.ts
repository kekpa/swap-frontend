// Created: Centralized avatar utilities for consistent colors and initials - 2025-05-29
export const AVATAR_COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple  
  '#EF4444', // Red
  '#F97316', // Orange
  '#10B981', // Green
  '#06B6D4', // Cyan
  '#8B5A2B', // Brown
  '#EC4899', // Pink
];

/**
 * Generate consistent avatar color based on entity ID or name
 * Uses entity ID for consistency, falls back to name if ID not available
 */
export const getAvatarColor = (entityIdOrName: string): string => {
  if (!entityIdOrName) return AVATAR_COLOR_PALETTE[0];
  
  // Use the first character's char code for consistent hashing
  const charCode = entityIdOrName.charCodeAt(0) || 0;
  return AVATAR_COLOR_PALETTE[Math.abs(charCode) % AVATAR_COLOR_PALETTE.length];
};

/**
 * Generate initials from a display name
 */
export const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) return '??';
  
  const trimmedName = name.trim();
  const parts = trimmedName.split(' ').filter(part => part.length > 0);
  
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  
  return trimmedName.substring(0, 2).toUpperCase();
};

/**
 * Get avatar props for an entity (consistent across the app)
 */
export const getAvatarProps = (entityId: string, displayName: string) => {
  return {
    initials: getInitials(displayName),
    color: getAvatarColor(entityId), // Use entity ID for consistency
  };
}; 