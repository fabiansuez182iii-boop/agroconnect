/**
 * Property type definitions for AgroConnect.
 *
 * Architecture (v3.0 - Defensive catalog access):
 * - All 8 Colombian crops defined
 * - All 5 certifications defined
 * - Exported getCropInfo() helper with fallback for unknown values
 * - Prevents runtime errors from Supabase data inconsistencies
 */

// ============================================
// CROP TYPES
// ============================================
export type CropType =
  | 'coffee'
  | 'cacao'
  | 'banana'
  | 'sugarcane'
  | 'rice'
  | 'corn'
  | 'cassava'
  | 'oil_palm';

export interface CropInfo {
  displayName: string;
  emoji: string;
  color: string;
  season: string;
}

export const CROP_CATALOG: Record<CropType, CropInfo> = {
  coffee: {
    displayName: 'Café',
    emoji: '☕',
    color: '#8B4513',
    season: 'Septiembre - Diciembre',
  },
  cacao: {
    displayName: 'Cacao',
    emoji: '🍫',
    color: '#6B4423',
    season: 'Abril - Junio',
  },
  banana: {
    displayName: 'Banano',
    emoji: '🍌',
    color: '#FFD700',
    season: 'Todo el año',
  },
  sugarcane: {
    displayName: 'Caña de Azúcar',
    emoji: '🎋',
    color: '#7CB342',
    season: 'Enero - Marzo',
  },
  rice: {
    displayName: 'Arroz',
    emoji: '🌾',
    color: '#DAA520',
    season: 'Marzo - Mayo',
  },
  corn: {
    displayName: 'Maíz',
    emoji: '🌽',
    color: '#FFA500',
    season: 'Junio - Agosto',
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
 * Fallback crop info for unknown/missing crops from database.
 */
export const FALLBACK_CROP_INFO: CropInfo = {
  displayName: 'Cultivo',
  emoji: '🌱',
  color: '#6B7280',
  season: 'Todo el año',
};

/**
 * Safe getter for crop info with fallback.
 * Prevents "Cannot read properties of undefined" errors.
 */
export function getCropInfo(crop: string | undefined | null): CropInfo {
  if (!crop) return FALLBACK_CROP_INFO;
  return CROP_CATALOG[crop as CropType] || FALLBACK_CROP_INFO;
}

// ============================================
// CERTIFICATION TYPES
// ============================================
export type CertificationType =
  | 'organic'
  | 'rainforest_alliance'
  | 'fair_trade'
  | 'conventional'
  | 'global_gap';

export interface CertificationInfo {
  displayName: string;
  emoji: string;
  description: string;
}

export const CERTIFICATION_CATALOG: Record<CertificationType, CertificationInfo> = {
  organic: {
    displayName: 'Orgánico',
    emoji: '🌿',
    description: 'Certificación de producción orgánica',
  },
  rainforest_alliance: {
    displayName: 'Rainforest Alliance',
    emoji: '🌳',
    description: 'Certificación de sostenibilidad ambiental',
  },
  fair_trade: {
    displayName: 'Comercio Justo',
    emoji: '🤝',
    description: 'Certificación de comercio justo',
  },
  conventional: {
    displayName: 'Convencional',
    emoji: '🏭',
    description: 'Producción agrícola convencional',
  },
  global_gap: {
    displayName: 'Global GAP',
    emoji: '✅',
    description: 'Buenas Prácticas Agrícolas certificadas',
  },
};

/**
 * Safe getter for certification info with fallback.
 */
export function getCertificationInfo(
  certification: string | undefined | null
): CertificationInfo | null {
  if (!certification) return null;
  return CERTIFICATION_CATALOG[certification as CertificationType] || null;
}

// ============================================
// PROPERTY IMAGE TYPE
// ============================================
export interface PropertyImage {
  publicId: string;
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
  bytes?: number;
  uploadedAt?: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  lqip?: string;
}

// ============================================
// PROPERTY TYPE
// ============================================
export interface Property {
  id: string;
  name: string;
  owner: string;
  department: string;
  municipality: string;
  crop: CropType;
  area: number;
  productivity: number;
  certification?: CertificationType;
  lat: number;
  lng: number;
  images?: PropertyImage[];
  coordinates?: [number, number][];
  description?: string;
  contact?: string;
}

// ============================================
// HEATMAP POINT TYPE
// ============================================
export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}
