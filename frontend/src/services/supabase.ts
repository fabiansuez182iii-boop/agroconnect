/**
 * Cliente Supabase para AgroConnect
 * Conecta el frontend con la base de datos PostgreSQL
 * usando la API PostgREST automática de Supabase
 */
import { createClient } from '@supabase/supabase-js';
import type { Property, PropertyImage } from '../types/property';

// Variables de entorno (se configuran en Vercel)
// Usamos bracket notation por TS4111 (index signature)
const supabaseUrl =
  (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ||
  'https://TU_PROYECTO.supabase.co';
const supabaseAnonKey =
  (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) || 'TU_ANON_KEY_AQUI';

// Crear cliente singleton
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Tipo que representa una fila en la tabla properties de Supabase
 */
export interface PropertyRow {
  id: string;
  name: string;
  owner: string;
  department: string;
  municipality: string;
  crop: string;
  area: number;
  productivity: number;
  certification: string | null;
  lat: number;
  lng: number;
  images: unknown;
  coordinates: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Normaliza imágenes desde Supabase.
 * Supabase devuelve string[] (URLs directas), pero Property espera PropertyImage[].
 * Esta función convierte ambos formatos de forma flexible.
 */
function normalizeImages(images: unknown): PropertyImage[] {
  if (!images || !Array.isArray(images)) return [];

  return images
    .map((img) => {
      // Si ya es un objeto PropertyImage, usarlo tal cual
      if (typeof img === 'object' && img !== null && 'publicId' in img) {
        return img as PropertyImage;
      }
      // Si es string (URL directa de Supabase), convertir a PropertyImage
      if (typeof img === 'string' && img.length > 0) {
        return {
          publicId: img,
          url: img,
        } as PropertyImage;
      }
      return null;
    })
    .filter((img): img is PropertyImage => img !== null);
}

/**
 * Mapea una fila de Supabase al tipo Property del frontend
 * Proporciona valores por defecto para campos que no existen en la BD
 */
function mapRowToProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    department: row.department,
    municipality: row.municipality,
    crop: row.crop as Property['crop'],
    area: row.area,
    productivity: row.productivity,
    certification: (row.certification as Property['certification']) || undefined,
    lat: row.lat,
    lng: row.lng,
    images: normalizeImages(row.images),
    coordinates: (row.coordinates as [number, number][]) || [],
    // Campos que no existen en Supabase - valores por defecto generados dinámicamente
    description: `Propiedad agrícola ubicada en ${row.municipality}, ${row.department}. Dedicada al cultivo de ${row.crop} con ${row.area} hectáreas de extensión.`,
    contact: `+57 300 ${Math.floor(1000000 + Math.random() * 9000000)}`,
  };
}

/**
 * Obtiene todas las propiedades desde la base de datos
 */
export async function fetchProperties(): Promise<Property[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Error fetching properties:', error);
      throw error;
    }

    return (data as PropertyRow[]).map(mapRowToProperty);
  } catch (error) {
    console.error('[Supabase] Exception:', error);
    return [];
  }
}

/**
 * Busca propiedades por texto (nombre, municipio, departamento, cultivo)
 */
export async function searchProperties(query: string): Promise<Property[]> {
  try {
    const normalizedQuery = query.toLowerCase().trim();

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .or(
        `name.ilike.%${normalizedQuery}%,municipality.ilike.%${normalizedQuery}%,department.ilike.%${normalizedQuery}%`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as PropertyRow[]).map(mapRowToProperty);
  } catch (error) {
    console.error('[Supabase] Search error:', error);
    return [];
  }
}
