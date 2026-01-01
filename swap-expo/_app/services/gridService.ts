// Updated: Replaced H3 with standard geohash algorithm - 2024-07-03
// Updated: Added vector tile support for improved grid performance - 2024-07-04
// Updated: Fixed grid to use consistent geohash level 9 with proper alignment - 2024-07-10
// Updated: Improved grid generation with pre-loading and smoother transitions - 2024-07-12
// Updated: Adjusted pre-generation logic for new visibility thresholds - 2024-07-12
// Updated: Added check to prevent sampling at initial low zoom levels - 2024-07-26
// Updated: Enhanced no-sampling logic for web to eliminate discontinuous grid - 2024-07-26

import { BoundingBox, GridCell } from '../types/map';
import { GRID, ZOOM_THRESHOLDS } from '../constants/mapConstants';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

// Log platform info
logger.debug(`Initializing on platform: ${Platform.OS}, version: ${Platform.Version}`, 'map');

// Standard base-32 geohash encoding/decoding
const BASE32_CODES = "0123456789bcdefghjkmnpqrstuvwxyz";
const BASE32_CODES_DICT: { [key: string]: number } = {};

// Initialize lookup dictionary
for (let i = 0; i < BASE32_CODES.length; i++) {
  BASE32_CODES_DICT[BASE32_CODES.charAt(i)] = i;
}

// Cache of generated grid data to avoid redundant calculations
const gridCache = new Map<string, GeoJSON.FeatureCollection>();
const MAX_CACHE_SIZE = 10; // Increase cache size slightly

// Utility function to clear the oldest cache entry
function pruneCache() {
  if (gridCache.size > MAX_CACHE_SIZE) {
    const oldestKey = Array.from(gridCache.keys())[0];
    if (oldestKey) {
      gridCache.delete(oldestKey);
    }
  }
}

/**
 * Encodes a coordinate pair to a geohash with the specified precision.
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @param precision Length of the geohash
 * @returns Geohash string
 */
export function encodeGeohash(latitude: number, longitude: number, precision: number = GRID.GEOHASH_PRECISION): string {
  try {
    let lat_interval = [-90.0, 90.0];
    let lon_interval = [-180.0, 180.0];
    
    let geohash = "";
    let bit = 0;
    let ch = 0;
    
    let even = true;
    
    while (geohash.length < precision) {
      if (even) {
        const mid = (lon_interval[0] + lon_interval[1]) / 2;
        if (longitude > mid) {
          ch |= 1 << (4 - bit);
          lon_interval[0] = mid;
        } else {
          lon_interval[1] = mid;
        }
      } else {
        const mid = (lat_interval[0] + lat_interval[1]) / 2;
        if (latitude > mid) {
          ch |= 1 << (4 - bit);
          lat_interval[0] = mid;
        } else {
          lat_interval[1] = mid;
        }
      }
      
      even = !even;
      
      if (bit < 4) {
        bit++;
      } else {
        geohash += BASE32_CODES.charAt(ch);
        bit = 0;
        ch = 0;
      }
    }
    
    return geohash;
  } catch (error) {
    logger.error('Error encoding geohash', error, 'map');
    return '';
  }
}

/**
 * Decodes a geohash to latitude/longitude and bounding box
 * @param geohash Geohash string
 * @returns Object with decoded coordinates and bounding box
 */
export function decodeGeohash(geohash: string) {
  try {
    let lat_interval = [-90.0, 90.0];
    let lon_interval = [-180.0, 180.0];
    
    let lat_err = 90.0;
    let lon_err = 180.0;
    let is_even = true;
    
    let i = 0;
    while (i < geohash.length) {
      const c = geohash[i];
      const cd = BASE32_CODES_DICT[c];
      
      for (let j = 0; j < 5; j++) {
        const mask = 1 << (4 - j);
        
        if (is_even) {
          lon_err /= 2;
          if ((cd & mask) !== 0) {
            lon_interval[0] = (lon_interval[0] + lon_interval[1]) / 2;
          } else {
            lon_interval[1] = (lon_interval[0] + lon_interval[1]) / 2;
          }
        } else {
          lat_err /= 2;
          if ((cd & mask) !== 0) {
            lat_interval[0] = (lat_interval[0] + lat_interval[1]) / 2;
          } else {
            lat_interval[1] = (lat_interval[0] + lat_interval[1]) / 2;
          }
        }
        
        is_even = !is_even;
      }
      
      i++;
    }
    
    const latitude = (lat_interval[0] + lat_interval[1]) / 2;
    const longitude = (lon_interval[0] + lon_interval[1]) / 2;
    
    return {
      latitude,
      longitude,
      error: {
        latitude: lat_err,
        longitude: lon_err
      },
      bbox: {
        sw: [lon_interval[0], lat_interval[0]],
        ne: [lon_interval[1], lat_interval[1]]
      }
    };
  } catch (error) {
    logger.error('Error decoding geohash', error, 'map');
    return null;
  }
}

/**
 * Gets the bounding box of a geohash cell
 * @param geohash Geohash string
 * @returns Bounding box with SW and NE corners
 */
export function getBoundsOfCell(geohash: string) {
  const decoded = decodeGeohash(geohash);
  if (!decoded) return null;
  
  return {
    sw: decoded.bbox.sw,
    ne: decoded.bbox.ne
  };
}

/**
 * Gets the neighboring cells of a geohash
 * @param geohash Geohash string
 * @returns Object with neighboring geohashes
 */
export function getNeighbors(geohash: string) {
  const decoded = decodeGeohash(geohash);
  if (!decoded) return null;
  
  const latitude = decoded.latitude;
  const longitude = decoded.longitude;
  
  const latErr = decoded.error.latitude * 2;
  const lonErr = decoded.error.longitude * 2;
  
  const neighbors: { [key: string]: string } = {};
  neighbors.n = encodeGeohash(latitude + latErr, longitude, geohash.length);
  neighbors.s = encodeGeohash(latitude - latErr, longitude, geohash.length);
  neighbors.e = encodeGeohash(latitude, longitude + lonErr, geohash.length);
  neighbors.w = encodeGeohash(latitude, longitude - lonErr, geohash.length);
  neighbors.ne = encodeGeohash(latitude + latErr, longitude + lonErr, geohash.length);
  neighbors.se = encodeGeohash(latitude - latErr, longitude + lonErr, geohash.length);
  neighbors.nw = encodeGeohash(latitude + latErr, longitude - lonErr, geohash.length);
  neighbors.sw = encodeGeohash(latitude - latErr, longitude - lonErr, geohash.length);
  
  return neighbors;
}

/**
 * Calculate visible bounds from map
 */
export function getVisibleBounds(bounds: BoundingBox): BoundingBox {
  return {
    minLat: bounds.minLat,
    minLng: bounds.minLng,
    maxLat: bounds.maxLat,
    maxLng: bounds.maxLng
  };
}

/**
 * Get the grid cell identifier at a specific coordinate
 * Returns the geohash at the fixed precision level
 */
export const getCellAtCoordinate = (lat: number, lng: number): string => {
  return encodeGeohash(lat, lng, GRID.GEOHASH_PRECISION);
};

/**
 * Calculate grid opacity based on zoom level with smooth fade in/out
 */
export const calculateGridOpacity = (
  zoomLevel: number,
  fadeInZoom: number = ZOOM_THRESHOLDS.GRID_FADE_IN,
  fullyVisibleZoom: number = ZOOM_THRESHOLDS.GRID_FULLY_VISIBLE
): number => {
  // Fully transparent below fade-in point
  if (zoomLevel < fadeInZoom) return 0;
  // Fully opaque (or max opacity) at/above fully visible point
  if (zoomLevel >= fullyVisibleZoom) return 1;
  
  // Linear interpolation between fadeInZoom and fullyVisibleZoom
  const normalizedZoom = (zoomLevel - fadeInZoom) / (fullyVisibleZoom - fadeInZoom);
  
  // Apply cubic easing for smooth transition
  const eased = normalizedZoom * normalizedZoom * (3 - 2 * normalizedZoom);
  
  // Clamp the value between 0 and 1 to avoid potential floating point issues
  return Math.max(0, Math.min(1, eased));
};

/**
 * Generates vector tile data for a specific bounds
 * Always uses the same geohash precision (level 9) regardless of zoom
 * @param z Zoom level (used for deciding *if* to generate)
 * @param bounds Viewport bounds with additional padding
 * @returns GeoJSON FeatureCollection of grid cells
 */
export function generateGeohashVectorTile(z: number, bounds: BoundingBox): any {
  // Determine if we should generate data based on the FADE_IN threshold
  const generationThreshold = ZOOM_THRESHOLDS.GRID_FADE_IN;

  if (z < generationThreshold) {
    logger.debug(`Skipping tile generation for z=${z.toFixed(2)}, below threshold ${generationThreshold.toFixed(2)}`, 'map');
    // Return empty collection, but don't cache this empty result
    return { data: { type: 'FeatureCollection', features: [] }, cached: false }; 
  }
  
  logger.debug(`Generating grid for z=${z.toFixed(2)}`, 'map', {
    minLat: bounds.minLat.toFixed(6),
    maxLat: bounds.maxLat.toFixed(6),
    minLng: bounds.minLng.toFixed(6),
    maxLng: bounds.maxLng.toFixed(6)
  });
  
  // Always use the same precision (level 9) for consistent cell size
  const precision = GRID.GEOHASH_PRECISION;
  
  // Create a cache key based on bounds, rounded to reduce excessive unique keys
  const cacheKey = `${precision}_${bounds.minLat.toFixed(3)}_${bounds.minLng.toFixed(3)}_${bounds.maxLat.toFixed(3)}_${bounds.maxLng.toFixed(3)}`;
  
  // Check if we already have this grid in cache
  if (gridCache.has(cacheKey)) {
    logger.debug(`Using cached grid for ${cacheKey}`, 'map');
    return { data: gridCache.get(cacheKey), cached: true };
  }
  
  // Get grid cells for this tile/bounds
  const cells = generateCompleteGeohashGrid(bounds, precision);
  
  // Store non-empty results in cache for future use
  if (cells.features.length > 0) {
      gridCache.set(cacheKey, cells);
      pruneCache();
  }
  
  // Return tile data directly as GeoJSON
  return { data: cells, cached: false };
}

/**
 * Generates a complete grid of geohash cells for the given bounds
 * Ensures cells are perfectly aligned with the universal geohash grid
 * and form a connected grid with no gaps
 */
export function generateCompleteGeohashGrid(bounds: BoundingBox, precision: number): GeoJSON.FeatureCollection {
  try {
    // Add substantial padding to ensure coverage beyond viewport when panning
    const width = bounds.maxLng - bounds.minLng;
    const height = bounds.maxLat - bounds.minLat;
    const padding = GRID.EXTRA_PADDING_PERCENT; // Configurable padding for smooth panning
    
    const expandedBounds = {
      minLng: bounds.minLng - width * padding,
      maxLng: bounds.maxLng + width * padding,
      minLat: bounds.minLat - height * padding,
      maxLat: bounds.maxLat + height * padding
    };
    
    // Get a reference cell to establish exact cell dimensions
    const centerLat = (expandedBounds.minLat + expandedBounds.maxLat) / 2;
    const centerLng = (expandedBounds.minLng + expandedBounds.maxLng) / 2;
    const centerHash = encodeGeohash(centerLat, centerLng, precision);
    const centerBounds = getBoundsOfCell(centerHash);
    
    if (!centerBounds) {
      logger.error('Failed to get center cell bounds', null, 'map');
      return { type: 'FeatureCollection', features: [] };
    }
    
    // Get exact cell dimensions from reference cell
    const cellWidth = Math.abs(centerBounds.ne[0] - centerBounds.sw[0]);
    const cellHeight = Math.abs(centerBounds.ne[1] - centerBounds.sw[1]);
    
    // Important: Find the lowest geohash that completely covers our expanded bounds
    // This ensures alignment with the universal geohash grid
    // Start by finding a cell that contains the SW corner of our bounds
    const swLat = expandedBounds.minLat;
    const swLng = expandedBounds.minLng;
    
    // Find the base cell that contains the SW corner
    const baseHash = encodeGeohash(swLat, swLng, precision);
    const baseBounds = getBoundsOfCell(baseHash);
    
    if (!baseBounds) {
      logger.error('Failed to get base cell bounds', null, 'map');
      return { type: 'FeatureCollection', features: [] };
    }
    
    // Calculate starting points that align with the geohash grid
    // This ensures our grid is perfectly aligned with universal geohash
    const startLng = baseBounds.sw[0];
    const startLat = baseBounds.sw[1];
    
    // Calculate number of cells needed to cover the expanded area
    // We add +2 to ensure we have complete coverage with no gaps at edges
    const lngCells = Math.ceil((expandedBounds.maxLng - startLng) / cellWidth) + 2;
    const latCells = Math.ceil((expandedBounds.maxLat - startLat) / cellHeight) + 2;
    
    logger.debug(`Generating ${lngCells}x${latCells} cells at precision ${precision}`, 'map');
    
    // Check if we need to sample for performance
    const totalCells = lngCells * latCells;
    let skipFactor = 1;
    
    if (totalCells > GRID.MAX_CELLS_TO_RENDER) {
      // Calculate skip factor to bring cell count below the limit
      const samplingRate = Math.sqrt(GRID.MAX_CELLS_TO_RENDER / totalCells);
      skipFactor = Math.max(1, Math.ceil(1 / samplingRate));
      logger.debug(`Cell count ${totalCells} exceeds limit (${GRID.MAX_CELLS_TO_RENDER}), skipFactor: ${skipFactor}`, 'map');
      
      // For web, never sample - always generate complete grid
      // This eliminates the discontinuous grid effect
      if (Platform.OS === 'web') {
        logger.debug('Web platform detected, disabling sampling', 'map');
        skipFactor = 1;
      }
    }
    
    // If sampling would have happened (skipFactor > 1), return empty on mobile
    // We rely on MAX_CELLS_TO_RENDER being set appropriately per platform in constants
    if (skipFactor > 1 && Platform.OS !== 'web') {
        logger.debug(`Mobile limit exceeded, sampling needed (${skipFactor}), returning empty grid`, 'map');
        return { type: 'FeatureCollection', features: [] };
    }
    
    // Generate the complete grid of cell features
    const features: GeoJSON.Feature<GeoJSON.Polygon, GeoJSON.GeoJsonProperties>[] = [];
    const processedCells = new Set<string>();
    
    for (let latIdx = 0; latIdx < latCells; latIdx += skipFactor) {
      for (let lngIdx = 0; lngIdx < lngCells; lngIdx += skipFactor) {
        // Calculate the exact center coordinates for this cell
        const cellCenterLat = startLat + (latIdx + 0.5) * cellHeight;
        const cellCenterLng = startLng + (lngIdx + 0.5) * cellWidth;
        
        // Ensure we're using the official geohash for these coordinates
        const hash = encodeGeohash(cellCenterLat, cellCenterLng, precision);
        
        // Skip if we've already processed this cell
        if (processedCells.has(hash)) continue;
        processedCells.add(hash);
        
        // Get the exact bounds for this geohash cell
        const cellBounds = getBoundsOfCell(hash);
        if (!cellBounds) continue;
        
        // Create a polygon feature for this cell
        // Use the exact bounds from geohash to ensure perfect alignment
        const coordinates = [
          [cellBounds.sw[0], cellBounds.sw[1]],
          [cellBounds.sw[0], cellBounds.ne[1]],
          [cellBounds.ne[0], cellBounds.ne[1]],
          [cellBounds.ne[0], cellBounds.sw[1]],
          [cellBounds.sw[0], cellBounds.sw[1]]
        ];
        
        features.push({
          type: 'Feature',
          properties: {
            id: hash
          },
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
          }
        });
      }
    }
    
    logger.debug(`Generated ${features.length} grid cells`, 'map');
    return {
      type: 'FeatureCollection',
      features: features
    };
  } catch (error) {
    logger.error('Error generating geohash grid', error, 'map');
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Generate grid cells for native platforms
 * Uses the exact same universal geohash grid as the web version
 */
export function generateGridCells(bounds: BoundingBox): GridCell[] {
  // Generate geohash grid for these bounds
  const features = generateCompleteGeohashGrid(bounds, GRID.GEOHASH_PRECISION).features;
  
  // Convert GeoJSON features to GridCell format
  return features.map(feature => {
    const hash = feature.properties?.id || '';
    
    // Safely access coordinates with proper type checking
    const coordinates = (feature.geometry as GeoJSON.Polygon).coordinates[0];
    
    // Convert coordinates to expected format
    const cellCoordinates: [number, number][] = coordinates
      .slice(0, -1) // Remove last point (duplicate of first)
      .map((position) => [position[0], position[1]]);
    
    return {
      id: hash,
      coordinates: cellCoordinates
    };
  });
}

/**
 * Get nearest grid cell to the given coordinate
 * Used for snapping pins to the grid
 */
export function getNearestGridCell(lat: number, lng: number): { 
  hash: string, 
  center: [number, number], 
  bounds: { sw: [number, number], ne: [number, number] } 
} {
  // Get the geohash at the exact position
  const hash = encodeGeohash(lat, lng, GRID.GEOHASH_PRECISION);
  
  // Decode to get cell center and bounds
  const decoded = decodeGeohash(hash);
  if (!decoded) {
    throw new Error(`Failed to decode geohash: ${hash}`);
  }
  
  return {
    hash,
    center: [decoded.longitude, decoded.latitude],
    bounds: {
      sw: decoded.bbox.sw as [number, number],
      ne: decoded.bbox.ne as [number, number]
    }
  };
} 