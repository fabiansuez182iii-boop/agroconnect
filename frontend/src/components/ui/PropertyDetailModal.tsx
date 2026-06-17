/**
 * PropertyDetailModal component with modern animations.
 *
 * PhD-level interactive modal with:
 * - Smooth entrance/exit animations
 * - Staggered content reveal
 * - Micro-interactions on interactive elements
 * - Respects prefers-reduced-motion for accessibility
 * - Dynamic gallery title based on property type (Spanish grammatical gender)
 * - Closes via: Escape key OR explicit close button
 * - Locked backdrop: clicking outside does NOT close the modal
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */

import React, { useEffect, useCallback } from 'react';
import type { Property } from '../../types/property';
import { CROP_CATALOG, CERTIFICATION_CATALOG } from '../../types/property';
import { ImageGallery } from './ImageGallery';
import { ImageUpload } from './ImageUpload';

interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
}

/**
 * Modal component for displaying property details and managing images.
 * Closes via Escape key or explicit close button. Backdrop click is disabled.
 */
export function PropertyDetailModal({
  property,
  onClose,
}: PropertyDetailModalProps): React.ReactElement {
  const cropInfo = CROP_CATALOG[property.crop];
  const certificationInfo = property.certification
    ? CERTIFICATION_CATALOG[property.certification]
    : null;

  // Extract property type from property name (first word)
  const propertyType = property.name.split(' ')[0] || 'Propiedad';

  // Determine Spanish grammatical gender for the gallery title
  const masculineNouns = ['Terreno', 'Propiedad'];
  const galleryTitle = masculineNouns.includes(propertyType)
    ? `Galería del ${propertyType}`
    : `Galería de la ${propertyType}`;

  // Close on Escape key press (WCAG accessibility requirement)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-property-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative animate-[modalSlideUp_0.4s_ease-out]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 z-10 font-bold hover:scale-110 hover:rotate-90 active:scale-95"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
          {/* Left Column: Media & Upload */}
          <div className="space-y-6 animate-[slideInLeft_0.5s_ease-out]">
            <div className="animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                📸 {galleryTitle}
              </h3>
              {property.images && property.images.length > 0 ? (
                <ImageGallery images={property.images} className="h-72" />
              ) : (
                <div className="h-72 bg-gray-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-agro-green/50 transition-colors duration-300">
                  <span className="text-4xl mb-2 animate-bounce">🖼️</span>
                  <p className="text-gray-500 text-sm">No hay imágenes disponibles</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                📤 Subir Nuevas Fotos
              </h3>
              <ImageUpload
                folder={`properties/${property.id}`}
                tags={[property.crop, property.department.toLowerCase()]}
                maxFiles={5}
                onImagesUploaded={(newImages) => {
                  console.log(
                    `[AgroConnect] Nuevas imágenes subidas para ${property.name}:`,
                    newImages
                  );
                  // TODO: En la Fase de Backend, enviar estas imágenes a la API
                }}
              />
            </div>
          </div>

          {/* Right Column: Property Details */}
          <div className="animate-[slideInRight_0.5s_ease-out]">
            <div className="flex items-start gap-4 mb-6 animate-[fadeInUp_0.6s_ease-out_0.15s_both]">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl shadow-md flex-shrink-0 transition-transform duration-300 hover:scale-110 hover:rotate-12"
                style={{ backgroundColor: `${cropInfo.color}20` }}
              >
                {cropInfo.emoji}
              </div>
              <div>
                <h2
                  id="modal-property-title"
                  className="text-2xl font-bold text-agro-green leading-tight"
                >
                  {property.name}
                </h2>
                {/* Complete location: municipality - department, country */}
                <p className="text-gray-500 flex items-center gap-1 mt-1">
                  📍 {property.municipality} - {property.department}, Colombia
                </p>
              </div>
            </div>

            {/* Unique Description */}
            <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-yellow-50 rounded-xl border border-green-100 animate-[fadeInUp_0.6s_ease-out_0.25s_both] hover:shadow-lg transition-shadow duration-300">
              <p className="text-xs text-agro-dark uppercase font-semibold tracking-wide mb-2 flex items-center gap-1">
                📝 Descripción
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {property.description}
              </p>
            </div>

            <div className="space-y-4 bg-gradient-to-br from-gray-50 to-green-50/30 p-5 rounded-xl border border-gray-100 animate-[fadeInUp_0.6s_ease-out_0.35s_both]">
              <div className="grid grid-cols-2 gap-4">
                <div className="animate-[fadeInUp_0.5s_ease-out_0.4s_both] group">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                    Propietario
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-1 group-hover:text-agro-green transition-colors duration-200">
                    👤 {property.owner}
                  </p>
                </div>
                <div className="animate-[fadeInUp_0.5s_ease-out_0.45s_both] group">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                    Cultivo Principal
                  </p>
                  <div className="mt-1">
                    <span
                      className="px-2.5 py-1 text-white text-xs font-semibold rounded-full shadow-sm inline-block transition-all duration-200 group-hover:scale-110 group-hover:shadow-md"
                      style={{ backgroundColor: cropInfo.color }}
                    >
                      {cropInfo.displayName}
                    </span>
                  </div>
                </div>
                <div className="animate-[fadeInUp_0.5s_ease-out_0.5s_both] group">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                    Área Total
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-1 group-hover:text-agro-green transition-colors duration-200">
                    📐 {property.area} hectáreas
                  </p>
                </div>
                <div className="animate-[fadeInUp_0.5s_ease-out_0.55s_both] group">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                    Productividad
                  </p>
                  <p
                    className={`text-lg font-bold mt-1 transition-transform duration-200 group-hover:scale-110 ${
                      property.productivity >= 70
                        ? 'text-green-600'
                        : property.productivity >= 40
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    📈 {property.productivity}%
                  </p>
                </div>
                <div className="animate-[fadeInUp_0.5s_ease-out_0.6s_both] group">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                    Temporada
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-1 group-hover:text-agro-green transition-colors duration-200">
                    📅 {cropInfo.season}
                  </p>
                </div>
                <div className="animate-[fadeInUp_0.5s_ease-out_0.65s_both] group">
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                    Certificación
                  </p>
                  <p className="text-sm font-medium text-gray-800 mt-1 group-hover:text-agro-green transition-colors duration-200">
                    {certificationInfo ? (
                      <span className="inline-block transition-transform duration-200 group-hover:scale-110">
                        {certificationInfo.emoji} {certificationInfo.displayName}
                      </span>
                    ) : (
                      <span className="text-gray-500 inline-block transition-transform duration-200 group-hover:scale-110">
                        ⚪ Sin Certificación
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 animate-[fadeInUp_0.5s_ease-out_0.7s_both] group">
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                  Contacto
                </p>
                <p className="text-sm font-medium text-agro-green mt-1 group-hover:scale-105 transition-transform duration-200 inline-block">
                  📞 {property.contact}
                </p>
              </div>
            </div>

            {/* Architectural Note */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 leading-relaxed animate-[fadeInUp_0.6s_ease-out_0.8s_both] hover:shadow-md transition-shadow duration-300">
              <strong>💡 Nota de Arquitectura (Fase Backend):</strong> Las imágenes
              subidas aquí se sincronizarán con PostgreSQL y el mapa se actualizará en
              tiempo real vía WebSockets. El nombre de la propiedad es un campo
              obligatorio y determina el título de la galería según su género gramatical
              en español. Por ahora, los datos se mantienen en el estado local de React.
            </div>
          </div>
        </div>
      </div>

      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
