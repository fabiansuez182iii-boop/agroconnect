/**
 * Root application component for AgroConnect.
 * Orchestrates the main layout, KPIs, Map, and Producer Cards.
 * Integrates the PropertyDetailModal for rich interactions and Cloudinary uploads.
 *
 * Architecture (v2.1 - Defensive Rendering + Supabase Integration):
 * - Properties loaded from PostgreSQL via PostgREST (Supabase)
 * - Defensive fallback for unknown crops/certifications (prevents undefined errors)
 * - Loading state with premium spinner
 * - Error state with retry functionality
 * - All KPIs calculated from real database data
 */

import { useState, lazy, Suspense, useMemo, useEffect } from 'react';
import { fetchProperties } from './services/supabase';
import { getImageUrl } from './services/cloudinary';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PropertyDetailModal } from './components/ui/PropertyDetailModal';
import { CROP_CATALOG, getCropInfo, getCertificationInfo } from './types/property';
import type { Property } from './types/property';

const PropertyMap = lazy(() =>
  import('./components/maps/PropertyMap').then((module) => ({
    default: module.PropertyMap,
  }))
);

function MapLoadingFallback(): React.ReactElement {
  return (
    <div className="w-full h-[600px] bg-gradient-to-br from-gray-50 to-green-50 rounded-xl flex items-center justify-center border border-gray-200">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-agro-green/20 border-t-agro-green"></div>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            🗺️
          </div>
        </div>
        <p className="text-gray-700 font-semibold mt-4">Cargando mapa interactivo...</p>
      </div>
    </div>
  );
}

function handleMapError(error: Error): void {
  console.error('[App] Map component error:', error);
}

/**
 * Premium Loading Component - Shown while fetching from Supabase
 */
function LoadingScreen(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center">
      <div className="text-center animate-fadeInUp">
        <div className="relative inline-block mb-6">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-agro-green/20 border-t-agro-green"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            🌱
          </div>
        </div>
        <h2 className="text-2xl font-bold text-agro-dark mb-2">AgroConnect</h2>
        <p className="text-gray-600 font-medium mb-1">
          Conectando con base de datos PostgreSQL
        </p>
        <p className="text-sm text-gray-500">
          Cargando propiedades agrícolas desde Supabase...
        </p>
        <div className="mt-6 flex justify-center gap-1">
          <div
            className="w-2 h-2 bg-agro-green rounded-full animate-bounce"
            style={{ animationDelay: '0s' }}
          ></div>
          <div
            className="w-2 h-2 bg-agro-green rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-2 h-2 bg-agro-green rounded-full animate-bounce"
            style={{ animationDelay: '0.4s' }}
          ></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Error Screen Component - Shown when Supabase connection fails
 */
function ErrorScreen({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-scaleIn">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-red-700 mb-3">Error de Conexión</h2>
        <p className="text-gray-700 mb-2 font-medium">
          No se pudo conectar con la base de datos
        </p>
        <p className="text-sm text-gray-500 mb-6 bg-red-50 rounded-lg p-3 border border-red-100">
          {error}
        </p>
        <div className="space-y-2 text-left text-xs text-gray-600 mb-6 bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-gray-800 mb-2">🔍 Posibles causas:</p>
          <p>• Variables de entorno no configuradas</p>
          <p>• Supabase URL o ANON KEY incorrectos</p>
          <p>• Tabla 'properties' no existe en la base de datos</p>
          <p>• Row Level Security bloqueando las consultas</p>
          <p>• Problema de red o CORS</p>
        </div>
        <button
          onClick={onRetry}
          className="w-full py-3 bg-gradient-to-r from-agro-green to-green-600 text-white rounded-lg font-semibold hover:shadow-xl hover:scale-105 active:scale-95 interactive-transition flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Reintentar Conexión</span>
        </button>
        <button
          onClick={() => window.open('https://app.supabase.com', '_blank')}
          className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 interactive-transition text-sm"
        >
          Abrir Dashboard de Supabase
        </button>
      </div>
    </div>
  );
}

function App(): React.ReactElement {
  // ============================================
  // STATE: Properties from Supabase
  // ============================================
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showProductiveZones, setShowProductiveZones] = useState(true);
  const [enableDrawing, setEnableDrawing] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // ============================================
  // EFFECT: Load properties from Supabase
  // ============================================
  const loadProperties = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('[App] 🔄 Fetching properties from Supabase...');
      const data = await fetchProperties();

      if (data.length === 0) {
        setError(
          'La base de datos está vacía. Ejecuta el script SQL de inicialización en Supabase.'
        );
        setProperties([]);
      } else {
        setProperties(data);
        console.log(`[App] ✅ Loaded ${data.length} properties from Supabase`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[App] ❌ Error loading properties:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  // ============================================
  // KPI CALCULATIONS (from real DB data)
  // ============================================
  const totalArea = useMemo(
    () => properties.reduce((acc, p) => acc + p.area, 0),
    [properties]
  );

  const avgProductivity = useMemo(
    () =>
      properties.length > 0
        ? Math.round(
            properties.reduce((acc, p) => acc + p.productivity, 0) / properties.length
          )
        : 0,
    [properties]
  );

  const organicCount = useMemo(
    () => properties.filter((p) => p.certification === 'organic').length,
    [properties]
  );

  const cropCounts = useMemo(
    () =>
      properties.reduce(
        (acc, property) => {
          acc[property.crop] = (acc[property.crop] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    [properties]
  );

  const topCrops = useMemo(() => {
    if (Object.keys(cropCounts).length === 0) return [];
    const maxCount = Math.max(...Object.values(cropCounts));
    return Object.entries(cropCounts)
      .filter(([, count]) => count === maxCount)
      .map(([crop]) => crop);
  }, [cropCounts]);

  // ============================================
  // RENDER: Loading State
  // ============================================
  if (loading) {
    return <LoadingScreen />;
  }

  // ============================================
  // RENDER: Error State
  // ============================================
  if (error) {
    return <ErrorScreen error={error} onRetry={loadProperties} />;
  }

  // ============================================
  // RENDER: Empty State (no properties in DB)
  // ============================================
  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            No hay propiedades registradas
          </h2>
          <p className="text-gray-600 mb-6">
            La base de datos PostgreSQL está conectada pero no contiene datos. Ejecuta el
            script SQL de inicialización en Supabase para cargar las propiedades de
            ejemplo.
          </p>
          <button
            onClick={loadProperties}
            className="w-full py-3 bg-agro-green text-white rounded-lg font-semibold hover:bg-agro-dark interactive-transition"
          >
            🔄 Recargar Datos
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Main Application (Success State)
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulseGlowGreen {
          0%, 100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
          50% { box-shadow: 0 0 20px 5px rgba(46, 125, 50, 0.2); }
        }

        @keyframes pulseGlowBlue {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          50% { box-shadow: 0 0 20px 5px rgba(37, 99, 235, 0.2); }
        }

        .animate-fadeInDown { animation: fadeInDown 0.6s ease-out both; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
        .animate-fadeInLeft { animation: fadeInLeft 0.6s ease-out both; }
        .animate-scaleIn { animation: scaleIn 0.7s ease-out both; }
        .animate-slideInRight { animation: slideInRight 0.5s ease-out both; }
        .animate-pulseGlowGreen { animation: pulseGlowGreen 2s ease-in-out infinite; }
        .animate-pulseGlowBlue { animation: pulseGlowBlue 2s ease-in-out infinite; }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
        .delay-600 { animation-delay: 0.6s; }
        .delay-700 { animation-delay: 0.7s; }
        .delay-800 { animation-delay: 0.8s; }
        .delay-900 { animation-delay: 0.9s; }
        .delay-1000 { animation-delay: 1.0s; }
        .delay-1100 { animation-delay: 1.1s; }
        .delay-1200 { animation-delay: 1.2s; }

        .interactive-transition {
          transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeInDown,
          .animate-fadeInUp,
          .animate-fadeInLeft,
          .animate-scaleIn,
          .animate-slideInRight,
          .animate-pulseGlowGreen,
          .animate-pulseGlowBlue {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <header className="bg-white shadow-sm border-b border-gray-200 animate-fadeInDown">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="animate-fadeInLeft delay-100">
              <h1 className="text-4xl font-bold text-agro-green flex items-center gap-2 hover:scale-105 interactive-transition cursor-default">
                🌱 AgroConnect
              </h1>
              <p className="text-gray-600 mt-1 font-bold hover:text-agro-green hover:scale-105 hover:translate-x-1 interactive-transition cursor-default inline-block">
                Del productor al comprador, sin intermediarios
              </p>
            </div>
            {/* KPI Cards: Calculated from real Supabase data */}
            <div className="flex gap-3 flex-wrap justify-end">
              <div className="w-36 h-28 bg-agro-green/10 rounded-lg border border-agro-green/30 animate-slideInRight delay-200 hover:scale-110 hover:shadow-lg interactive-transition cursor-default group animate-pulseGlowGreen flex flex-col items-center justify-center text-center p-3">
                <p className="text-xs text-agro-dark font-semibold group-hover:text-agro-green interactive-transition leading-tight">
                  Propiedades
                  <br />
                  Activas
                </p>
                <p className="text-3xl font-bold text-agro-green mt-1">
                  {properties.length}
                </p>
              </div>
              <div className="w-36 h-28 bg-agro-yellow/10 rounded-lg border-2 border-agro-yellow/30 animate-slideInRight delay-300 hover:scale-110 hover:shadow-lg hover:border-agro-yellow interactive-transition cursor-default group flex flex-col items-center justify-center text-center p-3">
                <p className="text-xs text-gray-700 font-semibold group-hover:text-agro-yellow interactive-transition leading-tight">
                  Hectáreas
                </p>
                <p className="text-3xl font-bold text-agro-dark mt-1">
                  {totalArea.toFixed(1)}
                </p>
              </div>
              <div className="w-36 h-28 bg-blue-50 rounded-lg border border-blue-200 animate-slideInRight delay-400 hover:scale-110 hover:shadow-lg interactive-transition cursor-default group animate-pulseGlowBlue flex flex-col items-center justify-center text-center p-3">
                <p className="text-xs text-blue-700 font-semibold group-hover:text-blue-900 interactive-transition leading-tight">
                  Productividad
                </p>
                <p className="text-3xl font-bold text-blue-800 mt-1">
                  {avgProductivity}%
                </p>
              </div>
              <div className="w-36 h-28 bg-green-50 rounded-lg border-2 border-green-300 animate-slideInRight delay-500 hover:scale-110 hover:shadow-lg hover:border-lime-400 interactive-transition cursor-default group flex flex-col items-center justify-center text-center p-3">
                <p className="text-xs text-green-700 font-semibold group-hover:text-lime-400 interactive-transition leading-tight">
                  Producción
                  <br />
                  Orgánica
                </p>
                <p className="text-3xl font-bold text-green-700 mt-1">{organicCount}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-8">
        <section className="bg-white rounded-2xl shadow-md p-6 mb-20 animate-scaleIn delay-300 hover:shadow-2xl hover:-translate-y-1 interactive-transition group">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="animate-fadeInLeft delay-400">
              <h2 className="text-2xl font-bold text-agro-dark group-hover:text-agro-green interactive-transition">
                🗺️ Mapa Interactivo de Propiedades
              </h2>
              <p className="text-gray-600 mt-1 text-sm group-hover:text-gray-800 interactive-transition">
                Explora los cultivos de tu región de forma sencilla
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowProductiveZones(!showProductiveZones)}
                className={`min-w-[220px] px-4 py-2 rounded-lg font-semibold text-sm animate-slideInRight delay-500 interactive-transition hover:scale-105 active:scale-95 flex items-center justify-center whitespace-nowrap ${
                  showProductiveZones
                    ? 'bg-agro-yellow text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Zonas Productivas {showProductiveZones ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setEnableDrawing(!enableDrawing)}
                className={`min-w-[220px] px-4 py-2 rounded-lg font-semibold text-sm animate-slideInRight delay-600 interactive-transition hover:scale-105 active:scale-95 flex items-center justify-center whitespace-nowrap ${
                  enableDrawing
                    ? 'bg-agro-green text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ✏️ Dibujar Parcelas {enableDrawing ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <ErrorBoundary onError={handleMapError}>
            <Suspense fallback={<MapLoadingFallback />}>
              <PropertyMap
                properties={properties}
                showProductiveZones={showProductiveZones}
                enableDrawing={enableDrawing}
                onPolygonCreated={(coords) => {
                  console.log('[App] 🎯 New parcel created:', coords);
                }}
              />
            </Suspense>
          </ErrorBoundary>
        </section>

        <section className="mb-20 animate-fadeInUp delay-500">
          <h2 className="text-2xl font-bold text-agro-dark mb-4 animate-fadeInLeft delay-600 text-left">
            🌾 Distribución por Tipo de Cultivo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(cropCounts).map(([crop, count], index) => {
              // ✅ DEFENSIVE: Safe getter with fallback for unknown crops
              const info = getCropInfo(crop);
              const isTopCrop = topCrops.includes(crop);
              const delayClass = `delay-${(index + 7) * 100}`;

              // Log warning for unknown crops (helps with debugging)
              if (!(crop in CROP_CATALOG)) {
                console.warn(
                  `[App] ⚠️ Cultivo no encontrado en catálogo: "${crop}". Usando fallback.`
                );
              }

              return (
                <div
                  key={crop}
                  className={`bg-white rounded-xl shadow-sm p-4 border-l-4 flex items-center gap-3 hover:shadow-xl hover:scale-105 hover:-translate-y-1 interactive-transition cursor-default animate-fadeInUp ${delayClass} group relative overflow-hidden`}
                  style={{
                    borderColor: info.color,
                    animation: isTopCrop
                      ? `pulseGlow_${crop.replace(/\s+/g, '_')} 2s ease-in-out infinite, fadeInUp 0.6s ease-out both`
                      : undefined,
                    animationDelay: isTopCrop ? `0s, ${(index + 7) * 0.1}s` : undefined,
                  }}
                >
                  {isTopCrop && (
                    <style>{`
                      @keyframes pulseGlow_${crop.replace(/\s+/g, '_')} {
                        0%, 100% { box-shadow: 0 0 0 0 ${info.color}40; }
                        50% { box-shadow: 0 0 20px 5px ${info.color}30; }
                      }
                    `}</style>
                  )}

                  <span className="text-3xl group-hover:scale-125 group-hover:rotate-12 interactive-transition">
                    {info.emoji}
                  </span>
                  <div>
                    <p className="text-xs text-gray-500 group-hover:text-agro-green interactive-transition">
                      {info.displayName}
                    </p>
                    <p className="text-xl font-bold text-gray-800 group-hover:text-agro-dark interactive-transition">
                      {count} {count === 1 ? 'finca' : 'fincas'}
                    </p>
                  </div>

                  {isTopCrop && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
                      ⭐ Top
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="animate-fadeInUp delay-800 mb-2">
          <h2 className="text-2xl font-bold text-agro-dark mb-4 animate-fadeInLeft delay-900 text-left">
            📋 Productores Destacados
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {properties.map((property, index) => {
              // ✅ DEFENSIVE: Safe getters with fallback for unknown crops/certifications
              const cropInfo = getCropInfo(property.crop);
              const certificationInfo = getCertificationInfo(property.certification);

              // Log warnings for unknown values (helps with debugging)

              if (!(property.crop in CROP_CATALOG)) {
                console.warn(
                  `[App] ⚠️ Propiedad "${property.name}" tiene cultivo desconocido: "${property.crop}". Usando fallback.`
                );
              }

              const thumbnailUrl =
                property.images && property.images.length > 0
                  ? typeof property.images[0] === 'string'
                    ? property.images[0]
                    : getImageUrl(property.images[0].publicId, 'medium')
                  : null;
              const delayClass = `delay-${Math.min((index + 10) * 100, 1200)}`;

              return (
                <div
                  key={property.id}
                  className={`w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-1rem)] bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 interactive-transition overflow-hidden flex flex-col animate-fadeInUp ${delayClass}`}
                >
                  {thumbnailUrl ? (
                    <div className="relative h-48 bg-gray-100 overflow-hidden group">
                      <img
                        src={thumbnailUrl}
                        alt={property.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback si la imagen falla al cargar
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-2 py-1 text-white text-xs font-semibold rounded-full shadow-md interactive-transition group-hover:scale-110"
                          style={{ backgroundColor: cropInfo.color }}
                        >
                          {cropInfo.emoji} {cropInfo.displayName}
                        </span>
                      </div>
                      {property.images && property.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full interactive-transition group-hover:bg-black/80">
                          📷 {property.images.length} fotos
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-48 bg-gradient-to-br from-agro-green/10 to-agro-yellow/10 flex items-center justify-center">
                      <span className="text-6xl">{cropInfo.emoji}</span>
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-2 py-1 text-white text-xs font-semibold rounded-full shadow-md"
                          style={{ backgroundColor: cropInfo.color }}
                        >
                          {cropInfo.displayName}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg text-agro-green mb-3">
                      {property.name}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 flex-grow">
                      <p>
                        👤 <strong>{property.owner}</strong>
                      </p>
                      <p>📍 {property.department}</p>
                      <p>📐 {property.area} hectáreas</p>
                      <p>
                        📈{' '}
                        <span
                          className={`font-bold ${
                            property.productivity >= 70
                              ? 'text-green-600'
                              : property.productivity >= 40
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {property.productivity}%
                        </span>
                      </p>
                      {certificationInfo ? (
                        <p>
                          {certificationInfo.emoji}{' '}
                          <span className="font-medium">
                            {certificationInfo.displayName}
                          </span>
                        </p>
                      ) : (
                        <p>
                          ⚪{' '}
                          <span className="font-medium text-gray-500">
                            Sin Certificación
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedProperty(property)}
                      className="mt-4 w-full py-2 bg-agro-green text-white rounded-lg hover:bg-agro-dark hover:shadow-lg hover:scale-105 active:scale-95 interactive-transition font-semibold text-sm"
                    >
                      Ver Detalles y Fotos
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-4 bg-gradient-to-br from-agro-dark via-green-900 to-agro-dark text-white animate-fadeInUp delay-1200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="group">
              <h3 className="text-2xl font-bold text-agro-yellow flex items-center gap-2 mb-3 group-hover:scale-105 interactive-transition">
                🌱 AgroConnect
              </h3>
              <p className="text-green-100 text-sm leading-relaxed font-semibold hover:text-white interactive-transition">
                Conectando el campo colombiano con el mundo a través de tecnología
                geoespacial y visualización de datos agrícolas.
              </p>
              <div className="flex gap-3 mt-4">
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-agro-green rounded-full flex items-center justify-center interactive-transition hover:scale-110 hover:-translate-y-1"
                  aria-label="Facebook"
                >
                  <span className="text-sm">📘</span>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-agro-green rounded-full flex items-center justify-center interactive-transition hover:scale-110 hover:-translate-y-1"
                  aria-label="Twitter"
                >
                  <span className="text-sm">🐦</span>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-agro-green rounded-full flex items-center justify-center interactive-transition hover:scale-110 hover:-translate-y-1"
                  aria-label="Instagram"
                >
                  <span className="text-sm">📷</span>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 bg-white/10 hover:bg-agro-green rounded-full flex items-center justify-center interactive-transition hover:scale-110 hover:-translate-y-1"
                  aria-label="LinkedIn"
                >
                  <span className="text-sm">💼</span>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-agro-yellow mb-3 uppercase tracking-wide">
                Enlaces Rápidos
              </h4>
              <ul className="space-y-2 text-sm">
                {[
                  'Mapa Interactivo',
                  'Productores Destacados',
                  'Distribución de Cultivos',
                  'Estadísticas',
                  'Contacto',
                ].map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-green-100 hover:text-agro-yellow hover:translate-x-2 interactive-transition inline-block"
                    >
                      → {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-bold text-agro-yellow mb-3 uppercase tracking-wide">
                Contacto
              </h4>
              <ul className="space-y-3 text-sm text-green-100">
                <li className="flex items-start gap-2 hover:text-white interactive-transition">
                  <span className="text-lg">📍</span>
                  <span>
                    SENA - Servicio Nacional de Aprendizaje
                    <br />
                    Centro de Comercio y Turismo - Armenia, Colombia
                  </span>
                </li>
                <li className="flex items-center gap-2 hover:text-white interactive-transition">
                  <span className="text-lg">📧</span>
                  <a href="mailto:agroconnet.07@gmail.com">agroconnet.07@gmail.com</a>
                </li>
                <li className="flex items-center gap-2 hover:text-white interactive-transition">
                  <span className="text-lg">📞</span>
                  <span>+57 317 576 15 71</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
              <p className="text-green-100 text-center md:text-left">
                © 2026 <span className="font-bold text-agro-yellow">AgroConnect</span> -
                Proyecto Formativo ADSO SENA
              </p>
              <p className="text-green-200 flex items-center gap-2 text-center md:text-right flex-wrap justify-center">
                <span>Powered by</span>
                <span className="font-semibold text-agro-yellow hover:text-white interactive-transition cursor-default">
                  PostgreSQL + PostgREST
                </span>
                <span>•</span>
                <span className="font-semibold text-agro-yellow hover:text-white interactive-transition cursor-default">
                  Supabase
                </span>
                <span>•</span>
                <span className="font-semibold text-agro-yellow hover:text-white interactive-transition cursor-default">
                  Vercel
                </span>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

export default App;
