// Updated: Configure MapapiService to use separate Map backend URL - 2025-01-30
import axios from 'axios';
import Constants from 'expo-constants';
import { ENV } from '../config/env';
import logger from '../utils/logger';

// Use the dedicated Map API URL from environment configuration
const API_BASE_URL = ENV.MAP_API_URL;

// Debug logging for Map API configuration
logger.debug('Map API Configuration', 'map', {
  MAP_API_URL: API_BASE_URL,
  envVars: {
    EXPO_PUBLIC_MAP_API_URL: process.env.EXPO_PUBLIC_MAP_API_URL,
  },
  constants: {
    MAP_API_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_MAP_API_URL,
  },
});

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increase to 30 second timeout for mobile
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Location Endpoints ---

export interface Location {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  geohash?: string;
  plus_code?: string;
  created_at?: string;
  updated_at?: string;
  category_id?: string;
  user_id?: string;
  // Add other fields as needed based on your Location interface/DTO
}

export interface LocationQueryParams {
  limit?: number;
  offset?: number;
  bounds?: string;  // Format: "sw_lat,sw_lng,ne_lat,ne_lng"
  zoom?: number;
  sources?: string; // Comma-separated source IDs
  categories?: string; // Comma-separated category IDs
  search?: string;
  near?: string;
  radius?: number;
}

export const fetchLocations = async (params?: LocationQueryParams): Promise<Location[]> => {
  try {
    // Update path to use the /api/public prefix
    const apiUrl = `${API_BASE_URL}/api/public/locations`;
    logger.debug('Fetching locations', 'map', { apiUrl, params });
    const response = await apiClient.get('/api/public/locations', { params }); // Use public path
    logger.debug('Received locations', 'map', { count: response.data?.length });
    return response.data;
  } catch (error) {
    logger.error('Error fetching locations', error, 'map');
    // Handle specific errors (e.g., network error, 404)
    if (axios.isAxiosError(error)) {
      logger.error('Axios error details', error.response?.data, 'map');
    }
    throw error; // Re-throw the error to be handled by the caller
  }
};

export const fetchLocationById = async (id: string): Promise<Location> => {
  try {
    // Update path
    const response = await apiClient.get(`/api/public/locations/${id}`); // Use public path
    return response.data;
  } catch (error) {
    logger.error(`Error fetching location ${id}`, error, 'map');
    throw error;
  }
};

// --- Search Endpoints ---

export interface SearchAPIResult {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  // Include other fields returned by your backend /search/location endpoint
}

export interface SearchResult {
  words: string[];
  language: string;
  latitude: number;
  longitude: number;
}

export const searchLocations = async (query: string, language: string = 'en'): Promise<SearchAPIResult[]> => {
  try {
    // Keep path as /api/v1 for search
    logger.debug('Searching locations', 'map', { query, language });
    const response = await apiClient.get('/api/v1/search/location', {
      params: { query, language },
    });
    logger.debug('Search results', 'map', { count: response.data?.length });
    return response.data;
  } catch (error) {
    logger.error('Error searching locations', error, 'map');
    if (axios.isAxiosError(error)) {
      logger.error('Search Axios error details', error.response?.data, 'map');
    }
    throw error;
  }
};

export const searchDecodeWords = async (words: string, language: string = 'en'): Promise<SearchResult> => {
  try {
    // Keep path as /api/v1 for search
    const response = await apiClient.get('/api/v1/search/decode', {
      params: { words, language },
    });
    return response.data;
  } catch (error) {
    logger.error('Error decoding words', error, 'map');
    throw error;
  }
};

// --- Geohash Endpoints ---

export const geohashEncode = async (lat: number, lng: number, precision: number = 9): Promise<any> => {
   try {
    // Keep path as /api/v1 for geohash
    const response = await apiClient.get('/api/v1/geohash/encode', {
      params: { lat: lat.toString(), lng: lng.toString(), precision: precision.toString() },
    });
    return response.data;
  } catch (error) {
    logger.error('Error encoding geohash', error, 'map');
    throw error;
  }
}

// --- Other Endpoints (Add as needed) ---

// Example: Fetch Categories
// export const fetchCategories = async (): Promise<any[]> => {
//   try {
//     const response = await apiClient.get('/categories');
//     return response.data;
//   } catch (error) {
//     logger.error('Error fetching categories', error, 'map');
//     throw error;
//   }
// };

export default apiClient; 