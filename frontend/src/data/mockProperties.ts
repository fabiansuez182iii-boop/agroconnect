/**
 * Mock data for development and demonstration purposes.
 *
 * In production, this data will come from the backend API
 * (Node.js + Express + PostgreSQL) and images will be uploaded
 * by users via the ImageUpload component to Cloudinary.
 *
 * IMPORTANT NOTES:
 * - Images use ONLY verified Cloudinary demo library public IDs
 * - Each property has exactly 2 images for visual consistency
 * - Each property has a UNIQUE contact phone number
 * - Each property has a UNIQUE Spanish description
 * - Owner names follow Colombian naming conventions (1-2 names + 1-2 surnames)
 */

import type { Property } from '../types/property';
import { getImageUrl } from '../services/cloudinary';

/**
 * Helper function to create Cloudinary image objects.
 */
function createMockImage(
  publicId: string,
  alt: string,
  preset: 'thumbnail' | 'medium' | 'large' = 'medium',
  bytes: number = 250000
): NonNullable<Property['images']>[number] {
  return {
    publicId,
    url: getImageUrl(publicId, preset),
    lqip: getImageUrl(publicId, 'lqip'),
    alt,
    width: preset === 'thumbnail' ? 200 : preset === 'medium' ? 600 : 1200,
    height: preset === 'thumbnail' ? 200 : preset === 'medium' ? 400 : 800,
    bytes,
    uploadedAt: '2026-01-15T10:30:00.000Z',
    moderationStatus: 'approved',
  };
}

/**
 * Mock properties dataset.
 * 10 properties distributed across Colombia's main agricultural regions.
 */
export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    name: 'Finca La Esperanza',
    owner: 'Carlos Andrés Martínez Rodríguez',
    description:
      'Finca familiar ubicada en las montañas de Cundinamarca, especializada en café de especialidad con prácticas orgánicas certificadas y procesos de beneficio tradicional que garantizan una taza excepcional con notas a chocolate y frutas rojas.',
    lat: 4.6249,
    lng: -74.0679,
    municipality: 'La Mesa',
    area: 50,
    crop: 'coffee',
    department: 'Cundinamarca',
    productivity: 85,
    certification: 'organic',
    contact: '+57 310 555 12 34',
    coordinates: [
      [4.6269, -74.0699],
      [4.6289, -74.0669],
      [4.6249, -74.0649],
      [4.6229, -74.0679],
    ],
    images: [
      createMockImage(
        'cld-sample-4',
        'Paisaje montañoso de la finca cafetera',
        'medium',
        320000
      ),
      createMockImage(
        'main-sample',
        'Vista panorámica de los cultivos de café',
        'medium',
        340000
      ),
    ],
  },
  {
    id: '2',
    name: 'Hacienda El Paraíso',
    owner: 'María González López',
    description:
      'Extensa hacienda cañera del Valle del Cauca con más de tres generaciones de experiencia en el cultivo de caña de azúcar, reconocida por sus prácticas de comercio justo y sostenibilidad ambiental en cada etapa productiva.',
    lat: 3.4516,
    lng: -76.532,
    municipality: 'Palmira',
    area: 120,
    crop: 'sugarcane',
    department: 'Valle del Cauca',
    productivity: 92,
    certification: 'fair_trade',
    contact: '+57 315 555 56 78',
    images: [
      createMockImage(
        'samples/coffee',
        'Productos derivados de la caña de azúcar',
        'medium',
        280000
      ),
      createMockImage(
        'samples/balloons',
        'Celebración de cosecha en la hacienda',
        'medium',
        410000
      ),
    ],
  },
  {
    id: '3',
    name: 'Finca San José',
    owner: 'José Rodrigo Rodríguez',
    description:
      'Pequeña finca cacaotera antioqueña dedicada a la producción de cacao fino de aroma, donde cada grano es seleccionado manualmente siguiendo técnicas ancestrales de fermentación y secado que resaltan su perfil sensorial único.',
    lat: 6.2518,
    lng: -75.5636,
    municipality: 'Jericó',
    area: 35,
    crop: 'cacao',
    department: 'Antioquia',
    productivity: 78,
    certification: 'organic',
    contact: '+57 320 555 90 12',
    images: [
      createMockImage(
        'samples/man-on-a-street',
        'Trabajador rural en los caminos de la finca',
        'medium',
        290000
      ),
      createMockImage(
        'samples/ecommerce/accessories-bag',
        'Empaque artesanal de cacao fino de aroma',
        'medium',
        210000
      ),
    ],
  },
  {
    id: '4',
    name: 'Finca La Victoria',
    owner: 'Ana Pérez',
    description:
      'Finca platanera del Cesar que combina técnicas modernas de cultivo con saberes tradicionales, produciendo plátano dominico y hartón de alta calidad para mercados nacionales e internacionales con estrictos controles fitosanitarios.',
    lat: 10.4806,
    lng: -73.2589,
    municipality: 'Valledupar',
    area: 80,
    crop: 'banana',
    department: 'Cesar',
    productivity: 65,
    certification: 'conventional',
    contact: '+57 318 555 34 56',
    images: [
      createMockImage(
        'samples/landscapes/nature-mountains',
        'Paisaje montañoso del Cesar con cultivos de plátano',
        'medium',
        350000
      ),
      createMockImage(
        'samples/people/bicycle',
        'Trabajador recorriendo los cultivos en bicicleta',
        'medium',
        380000
      ),
    ],
  },
  {
    id: '5',
    name: 'Hacienda El Triunfo',
    owner: 'Luis Hernández Castro',
    description:
      'Gran hacienda arrocera del Cauca con sistemas de riego tecnificado y maquinaria moderna, líder regional en productividad por hectárea gracias a la implementación de agricultura de precisión y monitoreo satelital.',
    lat: 2.4419,
    lng: -76.6064,
    municipality: 'Popayán',
    area: 200,
    crop: 'rice',
    department: 'Cauca',
    productivity: 88,
    contact: '+57 312 555 78 90',
    images: [
      createMockImage(
        'samples/landscapes/architecture-signs',
        'Infraestructura de la hacienda arrocera',
        'medium',
        330000
      ),
      createMockImage(
        'samples/landscapes/girl-urban-view',
        'Vista urbana desde la hacienda',
        'medium',
        380000
      ),
    ],
  },
  {
    id: '6',
    name: 'Finca Los Andes',
    owner: 'Rosa María Jiménez Torres',
    description:
      'Finca cafetera caldense ubicada en el corazón del Eje Cafetero, donde el café crece bajo sombra de árboles nativos como el nogal y el guamo, preservando la biodiversidad y obteniendo certificaciones orgánicas internacionales.',
    lat: 5.0689,
    lng: -75.4869,
    municipality: 'Manizales',
    area: 45,
    crop: 'coffee',
    department: 'Caldas',
    productivity: 94,
    certification: 'organic',
    contact: '+57 314 555 45 67',
    images: [
      createMockImage(
        'samples/food/pot-mussels',
        'Productos procesados de la finca cafetera',
        'medium',
        280000
      ),
      createMockImage(
        'samples/sheep',
        'Ganadería integrada con cultivos cafeteros',
        'medium',
        360000
      ),
    ],
  },
  {
    id: '7',
    name: 'Hacienda Santa Fe',
    owner: 'Pedro Gómez',
    description:
      'Hacienda palmera de Córdoba que integra ganadería sostenible con cultivos de palma de aceite, implementando prácticas convencionales responsables con el medio ambiente y generando empleo digno para más de 40 familias de la región.',
    lat: 8.7547,
    lng: -75.8789,
    municipality: 'Montería',
    area: 180,
    crop: 'oil_palm',
    department: 'Córdoba',
    productivity: 71,
    certification: 'conventional',
    contact: '+57 316 555 67 89',
    images: [
      createMockImage(
        'samples/food/fish-vegetables',
        'Productos agrícolas frescos de la hacienda',
        'medium',
        270000
      ),
      createMockImage(
        'sample',
        'Vista general de la plantación de palma',
        'medium',
        320000
      ),
    ],
  },
  {
    id: '8',
    name: 'Finca El Recreo',
    owner: 'Carmen Díaz Ospina',
    description:
      'Finca cacaotera de Nariño con certificación de comercio justo, donde familias campesinas trabajan colectivamente para producir chocolate artesanal de alta calidad que ha sido premiado en ferias internacionales.',
    lat: 1.2139,
    lng: -77.2808,
    municipality: 'Pasto',
    area: 28,
    crop: 'cacao',
    department: 'Nariño',
    productivity: 82,
    certification: 'fair_trade',
    contact: '+57 319 555 89 01',
    images: [
      createMockImage(
        'samples/animals/reindeer',
        'Fauna silvestre en los alrededores de la finca',
        'medium',
        290000
      ),
      createMockImage(
        'samples/food/dessert',
        'Chocolate artesanal derivado del cacao',
        'medium',
        280000
      ),
    ],
  },
  {
    id: '9',
    name: 'Finca La Cosecha',
    owner: 'Jorge Ramírez',
    description:
      'Finca maicera del Meta en los llanos orientales, combinando cultivos extensivos de maíz amarillo con cría de animales menores en un sistema productivo diversificado que maximiza el uso sostenible de la tierra.',
    lat: 4.1422,
    lng: -73.6263,
    municipality: 'Villavicencio',
    area: 95,
    crop: 'corn',
    department: 'Meta',
    productivity: 58,
    contact: '+57 311 555 23 45',
    images: [
      createMockImage(
        'samples/people/kitchen-bar',
        'Procesamiento artesanal de maíz',
        'medium',
        270000
      ),
      createMockImage(
        'samples/animals/three-dogs',
        'Perros guardianes de la finca',
        'medium',
        320000
      ),
    ],
  },
  {
    id: '10',
    name: 'Finca El Progreso',
    owner: 'Sofía Vargas Gutiérrez',
    description:
      'Finca yucal de Norte de Santander con tradición familiar centenaria, produciendo yuca industrial y de mesa para exportación mediante prácticas convencionales optimizadas que cumplen estándares internacionales de inocuidad.',
    lat: 7.1193,
    lng: -73.1227,
    municipality: 'Cúcuta',
    area: 60,
    crop: 'cassava',
    department: 'Norte de Santander',
    productivity: 73,
    certification: 'conventional',
    contact: '+57 317 555 01 23',
    images: [
      createMockImage(
        'samples/landscapes/beach-boat',
        'Paisaje de Norte de Santander',
        'medium',
        410000
      ),
      createMockImage(
        'samples/food/spices',
        'Yuca y productos agrícolas frescos',
        'medium',
        280000
      ),
    ],
  },
];
