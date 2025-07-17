// Created: Added map constants for OpenStreetMap and Google Maps integration - 2023-06-26
// Updated: Massively increased padding for persistent layer strategy - 2024-07-12
// Updated: Reduced padding, re-evaluating panning strategy - 2024-07-12
// Updated: Restored sensible constants for geohash level 9 grid - 2024-07-12
// Updated: Restored missing constants needed by GridOverlay - 2024-07-12
// Updated: Further increase zoom thresholds to reduce initial load chunkiness - 2024-07-12
// Updated: Lowered grid render limit and padding for mobile performance - 2024-07-16
// Updated: Further reduced padding and cell limit for mobile perf - 2024-07-16
// Updated: Introduced platform-specific grid constants - 2024-07-16
// Updated: Increased web grid padding to fix discontinuous grid - 2024-07-26
// Updated: Added blue dot styling and pin visibility threshold - 2024-07-31
// Updated: Increased marker sizes by 30% - 2024-08-01
// Updated: Increased border thickness for location dot - 2024-08-01

import { Platform } from 'react-native';

export const DEFAULT_CENTER_COORDINATE = [-122.4324, 37.78825]; // San Francisco
export const DEFAULT_ZOOM_LEVEL = 12;

// Map configuration
export const MAP_STYLES = {
  OPENSTREETMAP_BRIGHT: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
  // For MapLibre vector tiles if you prefer them over raster
  MAPLIBRE_BRIGHT: 'https://tiles.openfreemap.org/styles/bright'
};

// Zoom thresholds (mainly for Web/Deck.gl direct fade calculation)
export const ZOOM_THRESHOLDS = {
  GRID_FADE_IN: 17.3, 
  GRID_FULLY_VISIBLE: 17.8,
  PIN_VISIBILITY: 18.0, // Show pin when zoomed out, hide when zoomed in 
};

// --- Platform-Specific Grid Constants ---

const COMMON_GRID_CONFIG = {
  CELL_SIZE_METERS: 4.8, 
  GEOHASH_PRECISION: 9, 
  FADE_DURATION_MS: 500, 
  STROKE_COLOR: 'rgba(180, 180, 180, 0.7)', // Default standard color
  FILL_COLOR: 'rgba(0,0,0,0)', 
  SELECTED_CELL_FILL: 'rgba(139, 20, 253, 0.2)', // Translucent violet with 20% opacity
  SELECTED_CELL_STROKE: 'rgba(139, 20, 253, 1.0)', // Solid violet border
};

const WEB_GRID_CONFIG = {
  ...COMMON_GRID_CONFIG,
  MAX_CELLS_TO_RENDER: 70000, // Allow many cells on web
  EXTRA_PADDING_PERCENT: 1.0,  // Doubled padding on web to eliminate gaps
};

const MOBILE_GRID_CONFIG = {
  ...COMMON_GRID_CONFIG,
  MAX_CELLS_TO_RENDER: 15000, // Keep mobile limit low 
  EXTRA_PADDING_PERCENT: 0.01, // Reduce to almost zero (1%)
};

// Export the correct config based on platform
export const GRID = Platform.OS === 'web' ? WEB_GRID_CONFIG : MOBILE_GRID_CONFIG;

// User location dot styling
export const LOCATION_DOT = {
  SIZE: 24, // Increased by ~30% from 18px
  COLOR: '#1a73e8', // Google Maps blue
  BORDER_WIDTH: 4, // Increased border thickness
  BORDER_COLOR: 'white',
};

// Selection pin styling
export const PIN = {
  SIZE: 40, // Size for the selection pin (increased by 30%)
  COLOR: '#8b14fd', // Violet color matching selected cell
};

// Map layer types
export enum MapLayerType {
  STANDARD = 'standard',
  SATELLITE = 'satellite',
} 