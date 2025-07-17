// Created: Added TypeScript types for map components and data - 2023-06-26
// Updated: Added search focus state to MapState - 2024-07-02
// Updated: Added location details expansion state to MapState - 2024-07-02

// Map region types
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

// Grid cell types
export interface GridCell {
  id: string;
  coordinates: [number, number][]; // Array of lng/lat pairs for the polygon
  data?: any; // Optional metadata for the cell
}

// Map UI component props
export interface SearchBarProps {
  onSearch: (query: string) => void;
  style?: any;
  onFocusChange?: (isFocused: boolean) => void;
}

export interface MapControlProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCurrentLocation?: () => void;
  style?: any;
}

// Map state types
export interface MapState {
  region: Region;
  mapType: 'standard' | 'satellite';
  showGrid: boolean;
  zoomLevel: number;
  isLoading: boolean;
  isSearchFocused: boolean; // Added for centralized search focus state management
  isLocationDetailsExpanded: boolean; // Added for location details expansion state
}

// Location types
export interface LocationData {
  coordinate: Coordinate;
  timestamp: number;
  accuracy?: number;
}

// Search result object
export interface SearchResult {
  id: string;
  name: string;
  address?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  isRecent?: boolean;
  isFavorite?: boolean;
} 