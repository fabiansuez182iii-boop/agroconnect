/**
 * Cliente Supabase para AgroConnect
 */
import { createClient } from '@supabase/supabase-js';
import type { Property, PropertyImage } from '../types/property';

const supabaseUrl =
  (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ||
  'https://fwmaehhzfydbhilpfbrl.supabase.co';
const supabaseAnonKey =
  (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3bWFlaGh6ZnlkYmhpbHBmYnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjA2MDksImV4cCI6MjA5NzI5NjYwOX0._ie3wB-LOT1dYuFmvKLB6RXpSSS-rcmadNOPcGKOeTA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

function normalizeImages(images: unknown): PropertyImage[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img) => {
      if (typeof img === 'object' && img !== null && 'publicId' in img) {
        return img as PropertyImage;
      }
      if (typeof img === 'string' && img.length > 0) {
        return { publicId: img, url: img } as PropertyImage;
      }
      return null;
    })
    .filter((img): img is PropertyImage => img !== null);
}

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
    description: `Propiedad en ${row.municipality}, ${row.department}`,
    contact: '+57 300 123 4567',
  };
}

export async function fetchProperties(): Promise<Property[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Supabase] Error:', error);
      throw error;
    }
    return (data as PropertyRow[]).map(mapRowToProperty);
  } catch (error) {
    console.error('[Supabase] Exception:', error);
    return [];
  }
}

export async function searchProperties(query: string): Promise<Property[]> {
  try {
    const q = query.toLowerCase().trim();
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .or(`name.ilike.%${q}%,municipality.ilike.%${q}%,department.ilike.%${q}%`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PropertyRow[]).map(mapRowToProperty);
  } catch (error) {
    console.error('[Supabase] Search error:', error);
    return [];
  }
}
