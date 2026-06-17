/**
 * Type definitions for AgroConnect property data model.
 *
 * PhD-level domain modeling with:
 * - Discriminated unions for crop types
 * - Catalog pattern for crop metadata
 * - Catalog pattern for certification metadata
 * - Optional fields for progressive disclosure
 * - Strict typing for geospatial data
 * - Cloudinary image integration support
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/narrowing.html
 */

/**
 * Supported crop types in the AgroConnect platform.
 * Uses string literal union for type safety and autocomplete.
 */
export type CropType =
  | 'coffee'
  | 'cocoa'
  | 'plantain'
  | 'sugarcane'
  | 'rice'
  | 'corn'
  | 'cassava'
  | 'oil_palm';

/**
 * Metadata for each crop type.
 * Follows the Catalog Pattern for centralized configuration.
 */
export interface CropInfo {
  /** Display name in Spanish (for UI) */
  displayName: string;
  /** Emoji icon for visual representation */
  emoji: string;
  /** Brand color associated with the crop (hex) */
  color: string;
  /** Harvest season description (in Spanish for UI) */
  season: string;
}

/**
 * Centralized crop catalog.
 * Single source of truth for all crop-related metadata.
 * All display strings are in Spanish for the end-user UI.
 */
export const CROP_CATALOG: Record<CropType, CropInfo> = {
  coffee: {
    displayName: 'Café',
    emoji: '☕',
    color: '#6F4E37',
    season: 'Sep-Dic',
  },
  cocoa: {
    displayName: 'Cacao',
    emoji: '🍫',
    color: '#8B4513',
    season: 'Todo el año',
  },
  plantain: {
    displayName: 'Plátano',
    emoji: '🍌',
    color: '#FFD700',
    season: 'Todo el año',
  },
  sugarcane: {
    displayName: 'Caña de Azúcar',
    emoji: '🎋',
    color: '#90EE90',
    season: 'Ene-Mar',
  },
  rice: {
    displayName: 'Arroz',
    emoji: '🌾',
    color: '#F5DEB3',
    season: 'Mar-May',
  },
  corn: {
    displayName: 'Maíz',
    emoji: '🌽',
    color: '#FFA500',
    season: 'Abr-Jul',
  },
  cassava: {
    displayName: 'Yuca',
    emoji: '🥔',
    color: '#D2691E',
    season: 'Todo el año',
  },
  oil_palm: {
    displayName: 'Palma de Aceite',
    emoji: '🌴',
    color: '#228B22',
    season: 'Todo el año',
  },
};

/**
 * Certification types for agricultural products.
 * Internal values remain in English (industry standard for code).
 * Translation to Spanish happens via CERTIFICATION_CATALOG.
 */
export type CertificationType = 'organic' | 'conventional' | 'fair_trade';

/**
 * Metadata for each certification type.
 * Provides Spanish display names and emojis for the UI.
 */
export interface CertificationInfo {
  /** Display name in Spanish */
  displayName: string;
  /** Emoji icon for visual representation */
  emoji: string;
}

/**
 * Centralized certification catalog.
 * Translates internal English values to Spanish UI strings.
 */
export const CERTIFICATION_CATALOG: Record<CertificationType, CertificationInfo> = {
  organic: {
    displayName: 'Orgánica',
    emoji: '🌿',
  },
  conventional: {
    displayName: 'Convencional',
    emoji: '📋',
  },
  fair_trade: {
    displayName: 'Comercio Justo',
    emoji: '🤝',
  },
};

/**
 * Image metadata for property photos.
 * Supports Cloudinary transformations and optimization.
 */
export interface PropertyImage {
  /** Cloudinary public ID (unique identifier) */
  publicId: string;
  /** Full Cloudinary URL */
  url: string;
  /** Low-quality image placeholder URL for blur effect */
  lqip: string;
  /** Alt text for accessibility (Spanish) */
  alt: string;
  /** Image width in pixels (must be > 0) */
  width: number;
  /** Image height in pixels (must be > 0) */
  height: number;
  /** File size in bytes */
  bytes?: number;
  /** Upload timestamp (ISO 8601) */
  uploadedAt: string;
  /** Moderation status from Cloudinary AI (if enabled) */
  moderationStatus?: 'approved' | 'rejected' | 'pending';
}

/**
 * Core property entity.
 * Represents a registered agricultural producer in the platform.
 * Supports any property type: farm, hacienda, plot, terrain, etc.
 */
export interface Property {
  /** Unique identifier */
  id: string;
  /** Property name */
  name: string;
  /** Owner's full name (Colombian naming convention: 1-2 names + 1-2 surnames) */
  owner: string;
  /** Unique, detailed description of the property (Spanish) */
  description: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** Municipality or city where the property is located */
  municipality: string;
  /** Total area in hectares */
  area: number;
  /** Primary crop type */
  crop: CropType;
  /** Colombian department (state) */
  department: string;
  /** Productivity score (0-100, normalized tons/hectare) */
  productivity: number;
  /** Optional certification */
  certification?: CertificationType;
  /** Optional polygon coordinates for the parcel boundary */
  coordinates?: [number, number][];
  /** Contact phone number (must be unique across all properties) */
  contact: string;
  /** Array of property images from Cloudinary */
  images?: PropertyImage[];
}

/**
 * Point data for heatmap visualization.
 * Used by leaflet.heat plugin.
 */
export interface HeatmapPoint {
  lat: number;
  lng: number;
  /** Intensity value between 0 and 1 */
  intensity: number;
}
