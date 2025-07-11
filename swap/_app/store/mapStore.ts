// Created: Added Zustand store for map state management - 2023-06-26
// Updated: Added search focus state for cross-platform compatibility - 2024-07-02
// Updated: Added location details expansion state for UI coordination - 2024-07-02
// Updated: Changed grid to be visible by default - 2024-07-02
// Updated: Set default zoom level to grid visibility threshold - 2024-07-12

import { create } from 'zustand';
import { MapLayerType, ZOOM_THRESHOLDS } from '../constants/mapConstants';
import { Region, MapState } from '../types/map';

const DEFAULT_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Determine initial zoom based on NEW grid thresholds
const INITIAL_ZOOM_LEVEL = ZOOM_THRESHOLDS.GRID_FADE_IN + 0.2;

interface MapStore extends MapState {
  // Map state
  setRegion: (region: Region) => void;
  setMapType: (type: 'standard' | 'satellite') => void;
  toggleGrid: () => void;
  setZoomLevel: (zoomLevel: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  
  // Search state
  isSearchFocused: boolean;
  setSearchFocused: (focused: boolean) => void;
  
  // Location details state
  isLocationDetailsExpanded: boolean;
  setLocationDetailsExpanded: (expanded: boolean) => void;
  toggleLocationDetails: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  // Map state properties
  region: DEFAULT_REGION,
  mapType: MapLayerType.STANDARD,
  showGrid: true,
  zoomLevel: INITIAL_ZOOM_LEVEL,
  isLoading: false,
  
  // Search state properties
  isSearchFocused: false,
  
  // Location details state properties
  isLocationDetailsExpanded: false,
  
  // Map state actions
  setRegion: (region) => set({ region }),
  
  setMapType: (mapType) => set({ mapType }),
  
  toggleGrid: () => set((state) => ({ 
    showGrid: !state.showGrid 
  })),
  
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  // Search state actions
  setSearchFocused: (focused) => set((state) => {
    // When search is focused, automatically minimize location details
    if (focused && state.isLocationDetailsExpanded) {
      return { 
        isSearchFocused: focused,
        isLocationDetailsExpanded: false 
      };
    }
    return { isSearchFocused: focused };
  }),
  
  // Location details actions
  setLocationDetailsExpanded: (expanded) => set((state) => {
    // When location details is expanded, automatically close search
    if (expanded && state.isSearchFocused) {
      return { 
        isLocationDetailsExpanded: expanded,
        isSearchFocused: false 
      };
    }
    return { isLocationDetailsExpanded: expanded };
  }),
  
  toggleLocationDetails: () => set((state) => {
    const newExpanded = !state.isLocationDetailsExpanded;
    // When expanding location details, close search if open
    if (newExpanded && state.isSearchFocused) {
      return { 
        isLocationDetailsExpanded: newExpanded,
        isSearchFocused: false 
      };
    }
    return { isLocationDetailsExpanded: newExpanded };
  }),
})); 