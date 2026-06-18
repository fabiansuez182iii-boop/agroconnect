/**
 * PropertyMap component with enhanced interactivity.
 *
 * Architecture (v3.24 - Defensive crop access throughout):
 * - All CROP_CATALOG[property.crop] replaced with getCropInfo(property.crop)
 * - popupAnchor: [0, -20] for popup glued to icon with visible tip
 * - Restored original popup width (520/450) for better content display
 * - Restored triangular tip (▲) pointing to icon for premium UX
 * - Close button (✕) unified with search banner style (white/gray/red 24px)
 * - All previous functionality preserved (search, zoom lock, popup persistence)
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  LayersControl,
  useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-geosearch/dist/geosearch.css';
import 'react-leaflet-markercluster/styles';

import type { Property, HeatmapPoint } from '../../types/property';
import { CROP_CATALOG, getCropInfo } from '../../types/property';
import { createCropIcon, createClusterIcon } from '../../utils/mapIcons';
import { useLeafletDraw } from '../../hooks/useLeafletDraw';
import { ResetViewControl } from './ResetViewControl';
import { CustomZoomControl } from './ZoomControl';
import { ImageGallery } from '../ui/ImageGallery';

const MAP_CONSTANTS = {
  COLOMBIA_CENTER: [4.5709, -74.2973] as [number, number],
  DEFAULT_ZOOM: 6,
  SEARCH_CONTROL_CSS_CLASS: 'leaflet-control-geosearch',
  MAP_WRAPPER_CLASS: 'agroconnect-map-wrapper',
  CLOSE_BTN_CLASS: 'agroconnect-close-btn',
  TOGGLE_CONTROL_CLASS: 'agroconnect-toggle-control',
  SEARCH_RESULT_ZOOM: 17,
  CLUSTER_DISABLE_ZOOM: 15,
  COORDINATE_TOLERANCE: 0.001,
} as const;

/**
 * Combined search provider: Properties + OpenStreetMap places.
 * Uses getCropInfo() for safe access to crop display names.
 */
class CombinedSearchProvider {
  private properties: Property[];

  constructor(properties: Property[]) {
    this.properties = properties;
  }

  async search({ query }: { query: string }): Promise<
    Array<{
      x: number;
      y: number;
      label: string;
      bounds: null;
      raw: {
        type: 'property' | 'place';
        data: Property | { name: string; type: string };
      };
    }>
  > {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const results: Array<{
      x: number;
      y: number;
      label: string;
      bounds: null;
      raw: {
        type: 'property' | 'place';
        data: Property | { name: string; type: string };
      };
    }> = [];

    const propertyMatches = this.properties.filter((property) => {
      // ✅ DEFENSIVE: Use getCropInfo() instead of direct CROP_CATALOG access
      const cropDisplayName = getCropInfo(property.crop).displayName;
      const searchableText = [
        property.name,
        property.owner,
        property.department,
        property.municipality,
        cropDisplayName,
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });

    propertyMatches.forEach((property) => {
      results.push({
        x: property.lng,
        y: property.lat,
        label: `🌱 ${property.name} - ${property.municipality}, ${property.department}`,
        bounds: null,
        raw: { type: 'property', data: property },
      });
    });

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=co`,
        {
          headers: {
            'User-Agent': 'AgroConnect/1.0 (SENA Project)',
          },
        }
      );

      if (response.ok) {
        const places = await response.json();
        places.forEach(
          (place: { lat: string; lon: string; display_name: string; type: string }) => {
            results.push({
              x: parseFloat(place.lon),
              y: parseFloat(place.lat),
              label: `📍 ${place.display_name}`,
              bounds: null,
              raw: {
                type: 'place',
                data: { name: place.display_name, type: place.type },
              },
            });
          }
        );
      }
    } catch (error) {
      console.warn('[AgroConnect] Nominatim search failed:', error);
    }

    return results;
  }
}

/**
 * Helper function: find property by name in text
 */
function findPropertyByName(text: string, properties: Property[]): Property | null {
  const normalizedText = text.toLowerCase();
  return (
    properties.find((prop) => normalizedText.includes(prop.name.toLowerCase())) || null
  );
}

/**
 * Helper function: find marker by coordinates in map layers
 */
function findMarkerByCoordinates(
  map: L.Map,
  lat: number,
  lng: number,
  tolerance: number
): L.Marker | null {
  let targetMarker: L.Marker | null = null;

  map.eachLayer((layer: L.Layer) => {
    if (layer instanceof L.Marker) {
      const ll = layer.getLatLng();
      if (Math.abs(ll.lat - lat) < tolerance && Math.abs(ll.lng - lng) < tolerance) {
        targetMarker = layer;
      }
    }
  });

  return targetMarker;
}

/**
 * Helper function: clear search input and close suggestions dropdown.
 */
function clearSearchInput(mapContainer: HTMLElement): void {
  const input = mapContainer.querySelector<HTMLInputElement>(
    `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} input`
  );

  const resultsContainer = mapContainer.querySelector<HTMLElement>(
    `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results`
  );

  if (input) {
    input.value = '';
    const inputEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(inputEvent);
    input.blur();
  }

  setTimeout(() => {
    if (resultsContainer) {
      resultsContainer.innerHTML = '';
      console.log('[AgroConnect] 🧹 Results container cleared');
    }
  }, 50);

  console.log('[AgroConnect] 🧹 Search input cleared');
}

/**
 * Helper function: fly to location and open popup (for properties)
 */
function flyToAndOpenPopup(
  map: L.Map,
  property: Property,
  isMounted: { current: boolean },
  onPopupOpen?: (propertyId: string) => void
): void {
  console.log('[AgroConnect] 🎯 Flying to property:', property.name);

  const mapContainer = map.getContainer();
  const targetLatLng: L.LatLngExpression = [property.lat, property.lng];

  clearSearchInput(mapContainer);

  map.flyTo(targetLatLng, MAP_CONSTANTS.SEARCH_RESULT_ZOOM, {
    duration: 1.5,
  });

  setTimeout(() => {
    if (!isMounted.current) return;

    const targetMarker = findMarkerByCoordinates(
      map,
      property.lat,
      property.lng,
      MAP_CONSTANTS.COORDINATE_TOLERANCE
    );

    if (targetMarker !== null) {
      const markerRef: L.Marker = targetMarker;
      console.log('[AgroConnect] ✅ Marker found, opening popup');

      map.closePopup();

      setTimeout(() => {
        try {
          markerRef.openPopup();
          console.log('[AgroConnect] ✅ Popup opened successfully for:', property.name);

          if (onPopupOpen) {
            onPopupOpen(property.id);
          }
        } catch (err) {
          console.warn('[AgroConnect] ⚠️ openPopup failed, trying fire(click):', err);
          try {
            markerRef.fire('click');
          } catch (clickErr) {
            console.error('[AgroConnect] ❌ Could not open popup:', clickErr);
          }
        }
      }, 200);
    } else {
      console.warn('[AgroConnect] ⚠️ Marker not found after flyTo');
    }
  }, 1700);
}

/**
 * Helper function: fly to geographic place (no popup)
 */
function flyToPlace(map: L.Map, lat: number, lng: number, zoom: number = 13): void {
  console.log('[AgroConnect] 📍 Flying to place:', lat, lng);

  const mapContainer = map.getContainer();
  clearSearchInput(mapContainer);

  map.flyTo([lat, lng], zoom, { duration: 1.2 });
}

/**
 * Map Instance Capture component.
 */
function MapInstanceCapture({
  mapRef,
}: {
  mapRef: React.MutableRefObject<L.Map | null>;
}): null {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    console.log('[AgroConnect] 🗺️ Map instance captured');
  }, [map, mapRef]);

  return null;
}

/**
 * Zoom Lock on Popup component.
 */
function ZoomLockOnPopup(): null {
  const map = useMap();

  useEffect(() => {
    const mapContainer = map.getContainer();

    const disableZoom = (): void => {
      console.log('[AgroConnect] 🔒 Zoom disabled (popup open)');

      if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
      if (map.doubleClickZoom) map.doubleClickZoom.disable();
      if (map.touchZoom) map.touchZoom.disable();
      if (map.boxZoom) map.boxZoom.disable();

      mapContainer.setAttribute('data-popup-open', 'true');
    };

    const enableZoom = (): void => {
      console.log('[AgroConnect] 🔓 Zoom enabled (popup closed)');

      if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
      if (map.doubleClickZoom) map.doubleClickZoom.enable();
      if (map.touchZoom) map.touchZoom.enable();
      if (map.boxZoom) map.boxZoom.enable();

      mapContainer.removeAttribute('data-popup-open');
    };

    map.on('popupopen', disableZoom);
    map.on('popupclose', enableZoom);

    return () => {
      map.off('popupopen', disableZoom);
      map.off('popupclose', enableZoom);
      enableZoom();
    };
  }, [map]);

  return null;
}

/**
 * Search Control using EVENT DELEGATION on mapContainer.
 */
function SearchControl({
  properties,
  onPopupOpen,
}: {
  properties: Property[];
  onPopupOpen: (propertyId: string) => void;
}): null {
  const map = useMap();

  useEffect(() => {
    console.log('[AgroConnect] 🔧 SearchControl useEffect started');

    const mapContainer = map.getContainer();
    const existingControl = mapContainer.querySelector(
      `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS}`
    );
    if (existingControl) {
      console.log('[AgroConnect] ⚠️ Control already exists, skipping');
      return;
    }

    let control: InstanceType<typeof import('leaflet-geosearch').SearchControl> | null =
      null;
    const isMounted = { current: true };
    let observer: MutationObserver | null = null;
    let formSubmitHandler: ((e: Event) => void) | null = null;

    const globalClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;

      const resultItem = target.closest(
        `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results > *`
      ) as HTMLElement | null;

      if (!resultItem) return;

      e.preventDefault();
      e.stopPropagation();

      const resultText = resultItem.textContent || '';
      console.log('[AgroConnect] 🖱️ Result clicked:', resultText);

      if (resultText.startsWith('🌱')) {
        const selectedProperty = findPropertyByName(resultText, properties);

        if (selectedProperty) {
          console.log('[AgroConnect] ✅ Property found:', selectedProperty.name);
          flyToAndOpenPopup(map, selectedProperty, isMounted, onPopupOpen);
        }
      } else if (resultText.startsWith('📍')) {
        const placeName = resultText.substring(2).trim();
        console.log('[AgroConnect] 📍 Place selected:', placeName);

        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1&countrycodes=co`,
          {
            headers: {
              'User-Agent': 'AgroConnect/1.0 (SENA Project)',
            },
          }
        )
          .then((response) => response.json())
          .then((places) => {
            if (places.length > 0) {
              const place = places[0];
              flyToPlace(map, parseFloat(place.lat), parseFloat(place.lon), 13);
            }
          })
          .catch((error) => {
            console.warn('[AgroConnect] ⚠️ Place fetch failed:', error);
          });
      }
    };

    mapContainer.addEventListener('click', globalClickHandler, true);
    console.log('[AgroConnect] 👂 Global click handler attached');

    const init = async (): Promise<void> => {
      try {
        console.log('[AgroConnect] 📦 Importing leaflet-geosearch...');
        const { SearchControl: SearchControlClass } = await import('leaflet-geosearch');
        if (!isMounted.current) return;

        const provider = new CombinedSearchProvider(properties);
        control = new SearchControlClass({
          provider: provider as unknown as never,
          style: 'bar',
          searchLabel: '¿Qué estás buscando?',
          autoClose: false,
          showMarker: false,
          animateZoom: true,
          position: 'topright',
          notFoundMessage: 'No se encontró ninguna opción, busca nuevamente !!!',
        });

        map.addControl(control as unknown as L.Control);
        console.log('[AgroConnect] ✅ SearchControl added to map');

        observer = new MutationObserver(() => {
          if (!isMounted.current) return;

          const form = mapContainer.querySelector<HTMLFormElement>(
            `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form`
          );

          if (form && !formSubmitHandler) {
            console.log('[AgroConnect] 📋 Form detected');

            formSubmitHandler = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();

              const input = form.querySelector<HTMLInputElement>('input');
              const queryValue = input?.value.trim() || '';

              console.log('[AgroConnect] 📝 Form submitted:', queryValue);
              if (!queryValue) return;

              const matchedProperty = findPropertyByName(queryValue, properties);

              if (matchedProperty) {
                console.log('[AgroConnect] ✅ Enter matched:', matchedProperty.name);
                flyToAndOpenPopup(map, matchedProperty, isMounted, onPopupOpen);
              } else {
                console.log('[AgroConnect] 🔍 Searching place:', queryValue);

                fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryValue)}&limit=1&countrycodes=co`,
                  {
                    headers: {
                      'User-Agent': 'AgroConnect/1.0 (SENA Project)',
                    },
                  }
                )
                  .then((response) => response.json())
                  .then((places) => {
                    if (places.length > 0) {
                      const place = places[0];
                      flyToPlace(map, parseFloat(place.lat), parseFloat(place.lon), 13);
                    }
                  })
                  .catch((error) => {
                    console.warn('[AgroConnect] ⚠️ Place search failed:', error);
                  });
              }
            };

            form.addEventListener('submit', formSubmitHandler, true);
          }
        });

        observer.observe(mapContainer, {
          childList: true,
          subtree: true,
        });
      } catch (error) {
        console.error('[AgroConnect] ❌ Error initializing SearchControl:', error);
      }
    };

    void init();

    return () => {
      console.log('[AgroConnect] 🧹 SearchControl cleanup');
      isMounted.current = false;

      mapContainer.removeEventListener('click', globalClickHandler, true);

      if (observer) {
        observer.disconnect();
        observer = null;
      }

      if (formSubmitHandler) {
        const form = mapContainer.querySelector<HTMLFormElement>(
          `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form`
        );
        if (form) {
          form.removeEventListener('submit', formSubmitHandler, true);
        }
      }

      if (control) {
        try {
          map.removeControl(control as unknown as L.Control);
        } catch {
          // Ignore cleanup errors
        }
        control = null;
      }

      const orphan = mapContainer.querySelector(
        `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS}`
      );
      if (orphan && orphan.parentNode) orphan.parentNode.removeChild(orphan);
    };
  }, [map, properties, onPopupOpen]);

  return null;
}

/**
 * Injects the Close button (X) INSIDE the search form.
 */
function InjectCloseButton({ onClose }: { onClose: () => void }): null {
  const map = useMap();

  useEffect(() => {
    const mapContainer = map.getContainer();
    let isMounted = true;
    let injectedButton: HTMLButtonElement | null = null;
    let observer: MutationObserver | null = null;

    observer = new MutationObserver(() => {
      if (!isMounted) return;

      const form = mapContainer.querySelector<HTMLFormElement>(
        `.${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form`
      );

      if (form && !form.querySelector(`.${MAP_CONSTANTS.CLOSE_BTN_CLASS}`)) {
        const nativeReset = form.querySelector<HTMLButtonElement>('button.reset');
        if (nativeReset) {
          nativeReset.style.display = 'none';
          nativeReset.style.visibility = 'hidden';
        }

        injectedButton = document.createElement('button');
        injectedButton.type = 'button';
        injectedButton.className = MAP_CONSTANTS.CLOSE_BTN_CLASS;
        injectedButton.setAttribute('aria-label', 'Cerrar búsqueda');
        injectedButton.setAttribute('title', 'Cerrar Campo de Búsqueda');
        injectedButton.textContent = '✕';

        injectedButton.addEventListener('click', (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        });

        form.appendChild(injectedButton);
      }
    });

    observer.observe(mapContainer, {
      childList: true,
      subtree: true,
    });

    return () => {
      isMounted = false;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (injectedButton && injectedButton.parentNode) {
        injectedButton.parentNode.removeChild(injectedButton);
      }
    };
  }, [map, onClose]);

  return null;
}

/**
 * Toggle button (🔍) as a Leaflet Control.
 */
function SearchToggleLeafletControl({
  visible,
  onOpen,
}: {
  visible: boolean;
  onOpen: () => void;
}): null {
  const map = useMap();

  useEffect(() => {
    if (!visible) return;

    const ControlClass = L.Control.extend({
      onAdd() {
        const container = L.DomUtil.create(
          'div',
          `${MAP_CONSTANTS.TOGGLE_CONTROL_CLASS} leaflet-bar`
        );
        const button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = 'Abrir Campo de Búsqueda';
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', 'Abrir búsqueda de propiedades');
        button.innerHTML = '🔍';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        L.DomEvent.on(button, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          onOpen();
        });

        return container;
      },
    });

    const control = new ControlClass({ position: 'topright' });
    map.addControl(control);

    return () => {
      try {
        map.removeControl(control);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [map, visible, onOpen]);

  return null;
}

/**
 * Productive Zones Layer component.
 */
function ProductiveZonesLayer({ points }: { points: HeatmapPoint[] }): null {
  const map = useMap();

  useEffect(() => {
    let heatLayer: L.Layer | null = null;
    let isMounted = true;

    const init = async (): Promise<void> => {
      await import('leaflet.heat');
      if (!isMounted) return;

      const latlngs: L.HeatLatLngTuple[] = points.map((p) => [p.lat, p.lng, p.intensity]);

      heatLayer = L.heatLayer(latlngs, {
        radius: 30,
        blur: 20,
        maxZoom: 12,
        gradient: {
          0.0: '#2E7D32',
          0.4: '#4CAF50',
          0.6: '#F9A825',
          0.8: '#FF9800',
          1.0: '#D84315',
        },
      });

      heatLayer.addTo(map);
    };

    void init();

    return () => {
      isMounted = false;
      if (heatLayer) {
        try {
          map.removeLayer(heatLayer);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [map, points]);

  return null;
}

/**
 * Map Legend component.
 */
function MapLegend(): null {
  const map = useMap();

  useEffect(() => {
    const LegendControl = L.Control.extend({
      onAdd() {
        const div = L.DomUtil.create('div', 'info legend');
        div.style.cssText = `
          background: white; padding: 12px 16px; border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 12px;
          line-height: 1.6; max-width: 200px;
        `;
        div.innerHTML = `
          <h4 style="margin: 0 0 8px 0; color: #2E7D32; font-size: 14px; border-bottom: 2px solid #4CAF50; padding-bottom: 4px;">
            🌱 Tipos de Cultivo
          </h4>
          ${Object.entries(CROP_CATALOG)
            .map(
              ([, info]) => `
              <div style="display: flex; align-items: center; gap: 6px; margin: 2px 0;">
                <span style="font-size: 16px;">${info.emoji}</span>
                <span style="color: #333;">${info.displayName}</span>
              </div>
            `
            )
            .join('')}
          <div style="margin-top: 10px; padding-top: 8px; border-top: 2px solid #4CAF50;">
            <h4 style="margin: 0 0 8px 0; color: #2E7D32; font-size: 14px;">
              🎯 Productividad
            </h4>
            <div style="display: flex; gap: 2px; margin-top: 4px;">
              <div style="width: 20px; height: 12px; background: #2E7D32;" title="Baja"></div>
              <div style="width: 20px; height: 12px; background: #4CAF50;" title="Media-baja"></div>
              <div style="width: 20px; height: 12px; background: #F9A825;" title="Media-alta"></div>
              <div style="width: 20px; height: 12px; background: #FF9800;" title="Alta"></div>
              <div style="width: 20px; height: 12px; background: #D84315;" title="Muy alta"></div>
            </div>
          </div>
        `;
        return div;
      },
    });

    const legend = new LegendControl({ position: 'bottomright' });
    legend.addTo(map);

    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
}

/**
 * Attribution External Links component.
 */
function AttributionExternalLinks(): null {
  const map = useMap();

  useEffect(() => {
    const fixAttributionLinks = (): void => {
      const container = map.getContainer();
      const attributionControl = container.querySelector('.leaflet-control-attribution');
      if (!attributionControl) return;
      const links = attributionControl.querySelectorAll('a');
      links.forEach((link) => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.removeAttribute('title');
      });
    };

    const timeoutId = setTimeout(fixAttributionLinks, 100);
    const observer = new MutationObserver(fixAttributionLinks);
    observer.observe(map.getContainer(), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'title'],
    });

    map.on('baselayerchange', fixAttributionLinks);
    map.on('overlayadd', fixAttributionLinks);
    map.on('overlayremove', fixAttributionLinks);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      map.off('baselayerchange', fixAttributionLinks);
      map.off('overlayadd', fixAttributionLinks);
      map.off('overlayremove', fixAttributionLinks);
    };
  }, [map]);

  return null;
}

/**
 * Drawing Tools component.
 */
function DrawingTools({
  enabled,
  onPolygonCreated,
}: {
  enabled: boolean;
  onPolygonCreated?: (coords: [number, number][]) => void;
}): null {
  useLeafletDraw({ enabled, onPolygonCreated });
  return null;
}

/**
 * Popup Close Button component with Escape key support.
 * UNIFIED STYLE: Same as search banner close button (white/gray/red 24px).
 */
function PopupCloseButton(): React.ReactElement {
  const map = useMap();

  const handleClose = useCallback(() => {
    map.closePopup();
  }, [map]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        map.closePopup();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [map]);

  return (
    <button
      onClick={handleClose}
      className="absolute z-20 transition-all duration-200"
      style={{
        top: '10px',
        right: '10px',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: 'white',
        border: '1px solid #e5e7eb',
        color: '#6B7280',
        fontSize: '12px',
        fontWeight: 'bold',
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#EF4444';
        e.currentTarget.style.color = 'white';
        e.currentTarget.style.borderColor = 'white';
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.color = '#6B7280';
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
      aria-label="Cerrar popup"
    >
      ✕
    </button>
  );
}

/**
 * Main PropertyMap component.
 */
interface PropertyMapProps {
  properties: Property[];
  showProductiveZones?: boolean;
  enableDrawing?: boolean;
  onPolygonCreated?: (coords: [number, number][]) => void;
}

export function PropertyMap({
  properties,
  showProductiveZones = false,
  enableDrawing = false,
  onPolygonCreated,
}: PropertyMapProps): React.ReactElement {
  const heatmapPoints: HeatmapPoint[] = properties.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    intensity: p.productivity / 100,
  }));

  const [isSearchOpen, setIsSearchOpen] = useState(true);

  const openPopupPropertyIdRef = useRef<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        `.${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} input`
      );
      if (input) {
        input.focus();
        input.select();
      }
    }, 150);
  }, []);

  // Restore popup after layer/drawing changes
  useEffect(() => {
    if (!mapRef.current || !openPopupPropertyIdRef.current) return;

    const map = mapRef.current;
    const propertyId = openPopupPropertyIdRef.current;
    const property = properties.find((p) => p.id === propertyId);

    if (!property) return;

    setTimeout(() => {
      const marker = findMarkerByCoordinates(
        map,
        property.lat,
        property.lng,
        MAP_CONSTANTS.COORDINATE_TOLERANCE
      );

      if (marker) {
        try {
          marker.openPopup();
          console.log('[AgroConnect] ✅ Popup restored for:', property.name);
        } catch (err) {
          console.warn('[AgroConnect] ⚠️ Could not restore popup:', err);
        }
      }
    }, 100);
  }, [showProductiveZones, enableDrawing, properties]);

  const handlePopupOpen = useCallback((propertyId: string) => {
    openPopupPropertyIdRef.current = propertyId;
    console.log('[AgroConnect] 📌 Popup state saved for property:', propertyId);
  }, []);

  const handlePopupClose = useCallback(() => {
    openPopupPropertyIdRef.current = null;
    console.log('[AgroConnect] 📌 Popup state cleared');
  }, []);

  return (
    <div
      className={`${MAP_CONSTANTS.MAP_WRAPPER_CLASS} w-full h-[800px] rounded-xl overflow-hidden shadow-lg border border-gray-200 relative`}
      data-search-open={isSearchOpen ? 'true' : 'false'}
    >
      <style>{`

        /* ============================================ */
        /* LAYERS CONTROL - Minimal style override */
        /* ============================================ */
        .leaflet-control-layers {
          box-shadow: none !important;
          border: none !important;
        }

        /* ============================================ */
        /* ZOOM CONTROLS */
        /* ============================================ */
        .leaflet-control-zoom a {
          transition: all 0.3s ease !important;
        }

        .leaflet-control-zoom a:hover {
          background-color: #F97316 !important;
          color: #000000 !important;
          font-weight: bold !important;
        }

        /* ZOOM LOCK: Visual disable when popup is open */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS}[data-popup-open="true"] .leaflet-control-zoom a {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS}[data-popup-open="true"] .leaflet-control-zoom a:hover {
          background-color: inherit !important;
          color: inherit !important;
        }

        /* ============================================ */
        /* DRAWING TOOLS */
        /* ============================================ */
        .leaflet-draw-toolbar a {
          transition: all 0.3s ease !important;
        }

        .leaflet-draw-toolbar a.leaflet-draw-draw-polygon:hover,
        .leaflet-draw-toolbar a.leaflet-draw-draw-rectangle:hover,
        .leaflet-draw-toolbar a.leaflet-draw-draw-marker:hover {
          background-color: #FACC15 !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3C/svg%3E"), url(https://unpkg.com/leaflet-draw@1.0.4/dist/images/spritesheet.png) !important;
          filter: none !important;
        }

        .leaflet-draw-toolbar a.leaflet-draw-edit-edit:hover,
        .leaflet-draw-toolbar a.leaflet-draw-edit-remove:hover {
          background-color: #EF4444 !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3E%3C/svg%3E"), url(https://unpkg.com/leaflet-draw@1.0.4/dist/images/spritesheet.png) !important;
          filter: none !important;
        }

        .leaflet-draw-toolbar a:not(:hover) {
          filter: none !important;
        }

        /* ============================================ */
        /* SEARCH BANNER */
        /* ============================================ */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} {
          position: absolute !important;
          top: 16px !important;
          left: 50% !important;
          right: auto !important;
          transform: translateX(-50%) !important;
          width: 400px !important;
          min-width: 400px !important;
          max-width: 400px !important;
          z-index: 1000 !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS}[data-search-open="false"] .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} {
          display: none !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} > a {
          display: none !important;
        }

        /* ============================================ */
        /* FORM */
        /* ============================================ */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          background: white !important;
          border: none !important;
          outline: none !important;
          border-radius: 8px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
          overflow: visible !important;
          width: 400px !important;
          min-width: 400px !important;
          max-width: 400px !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* ============================================ */
        /* INPUT */
        /* ============================================ */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} input {
          flex: 0 1 400px !important;
          width: 400px !important;
          min-width: 400px !important;
          max-width: 400px !important;
          padding: 10px 40px 10px 14px !important;
          border: none !important;
          outline: none !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          background: transparent !important;
          color: #1B5E20 !important;
          font-family: inherit !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} input::placeholder {
          color: #6B7280 !important;
          font-style: italic !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} input:focus {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }

        /* Hide native reset button */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form > button.reset {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -9999px !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form > button:not(.${MAP_CONSTANTS.CLOSE_BTN_CLASS}):not(.reset) {
          display: none !important;
        }

        /* ============================================ */
        /* INJECTED CLOSE BUTTON */
        /* ============================================ */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form .${MAP_CONSTANTS.CLOSE_BTN_CLASS} {
          position: absolute !important;
          right: 10px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: white !important;
          color: #6B7280 !important;
          border: 1px solid #e5e7eb !important;
          outline: none !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          padding: 0 !important;
          margin: 0 !important;
          font-size: 12px !important;
          font-weight: bold !important;
          line-height: 1 !important;
          font-family: Arial, sans-serif !important;
          z-index: 10 !important;
          flex-shrink: 0 !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form .${MAP_CONSTANTS.CLOSE_BTN_CLASS}:hover {
          background: #EF4444 !important;
          color: white !important;
          border: 1px solid white !important;
          transform: translateY(-50%) scale(1.1) !important;
          box-shadow: 0 4px 8px rgba(239,68,68,0.3) !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} form .${MAP_CONSTANTS.CLOSE_BTN_CLASS}:active {
          transform: translateY(-50%) scale(0.95) !important;
        }

        /* ============================================ */
        /* RESULTS DROPDOWN - AUTO HIDE WHEN EMPTY */
        /* ============================================ */
        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          right: auto !important;
          width: 400px !important;
          min-width: 400px !important;
          max-width: 400px !important;
          background: white !important;
          border: none !important;
          border-radius: 0 0 8px 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          max-height: 300px !important;
          overflow-y: auto !important;
          margin-top: 2px !important;
          box-sizing: border-box !important;
          z-index: 1001 !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results:empty {
          display: none !important;
          border: none !important;
          box-shadow: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results:not(:empty) {
          border-top: 1px solid #E5E7EB !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results > * {
          padding: 6px 14px !important;
          border-bottom: 1px solid #F3F4F6 !important;
          cursor: pointer !important;
          font-size: 13px !important;
          color: #374151 !important;
          transition: background 0.15s ease !important;
          background: white !important;
          line-height: 1.3 !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results > *:hover {
          background: #F0FDF4 !important;
          color: #1B5E20 !important;
        }

        .${MAP_CONSTANTS.MAP_WRAPPER_CLASS} .${MAP_CONSTANTS.SEARCH_CONTROL_CSS_CLASS} .results > *:only-child {
          padding: 6px 14px !important;
          font-style: italic !important;
          color: #6B7280 !important;
          border-bottom: none !important;
          cursor: default !important;
        }

        /* ============================================ */
        /* TOGGLE BUTTON */
        /* ============================================ */
        .${MAP_CONSTANTS.TOGGLE_CONTROL_CLASS} {
          margin-top: 8px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .${MAP_CONSTANTS.TOGGLE_CONTROL_CLASS}.leaflet-bar,
        .${MAP_CONSTANTS.TOGGLE_CONTROL_CLASS} {
          box-shadow: none !important;
          border: none !important;
          background: transparent !important;
        }

        .${MAP_CONSTANTS.TOGGLE_CONTROL_CLASS} a {
          background: white !important;
          color: #2E7D32 !important;
          width: 42px !important;
          height: 42px !important;
          line-height: 40px !important;
          font-size: 26px !important;
          text-align: center !important;
          text-decoration: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
        }

        .${MAP_CONSTANTS.TOGGLE_CONTROL_CLASS} a:hover {
          background: #F0FDF4 !important;
          transform: scale(1.05) !important;
        }

        /* ============================================ */
        /* ATTRIBUTION */
        /* ============================================ */
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.85) !important;
          padding: 2px 6px !important;
          font-size: 11px !important;
          border-radius: 4px !important;
        }

        .leaflet-control-attribution a {
          color: #2E7D32 !important;
          text-decoration: none !important;
          font-weight: 500 !important;
        }

        .leaflet-control-attribution a:hover {
          text-decoration: underline !important;
          color: #1B5E20 !important;
        }

        /* ============================================ */
        /* POPUP - PREMIUM DESIGN WITH VISIBLE TIP */
        /* - Width: 520/450 (spacious for rich content)  */
        /* - Triangular tip (▲) visible, pointing to icon */
        /* ============================================ */
        @keyframes popupFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes popupSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .leaflet-popup {
          animation: popupFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15) !important;
          animation: popupSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
          padding: 0 !important;
          overflow: hidden !important;
        }

        /* TRIANGULAR TIP RESTORED - Premium UX pointing to icon */
        .leaflet-popup-tip-container {
          display: block !important;
          width: 40px !important;
          height: 12px !important;
          margin: 0 auto !important;
        }

        .leaflet-popup-tip {
          display: block !important;
          background: white !important;
          box-shadow: 0 3px 14px rgba(0,0,0,0.1) !important;
        }

        /* Popup content with proper spacing */
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          position: relative;
          width: auto !important;
        }

        .leaflet-popup-close-button {
          display: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .leaflet-popup,
          .leaflet-popup-content-wrapper {
            animation: none !important;
          }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .popup-gallery { animation: fadeInUp 0.4s ease-out 0.1s both; }
        .popup-header { animation: fadeInUp 0.4s ease-out 0.2s both; }
        .popup-details { animation: fadeInUp 0.4s ease-out 0.3s both; }
        .popup-coords { animation: fadeInUp 0.4s ease-out 0.4s both; }
      `}</style>

      <MapContainer
        center={MAP_CONSTANTS.COLOMBIA_CENTER}
        zoom={MAP_CONSTANTS.DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapInstanceCapture mapRef={mapRef} />

        <ZoomLockOnPopup />

        <CustomZoomControl
          position="topleft"
          zoomInText="+"
          zoomInTitle="Acercar"
          zoomOutText="−"
          zoomOutTitle="Alejar"
        />
        <ResetViewControl
          center={MAP_CONSTANTS.COLOMBIA_CENTER}
          zoom={MAP_CONSTANTS.DEFAULT_ZOOM}
          position="topleft"
          title="Centrar Mapa"
          label="🇨🇴"
        />

        <SearchControl properties={properties} onPopupOpen={handlePopupOpen} />
        <InjectCloseButton onClose={handleCloseSearch} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="🗺️ Estándar">
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🌾 Satélite">
            <TileLayer
              attribution='© <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🏔️ Topográfico">
            <TileLayer
              attribution='© <a href="https://opentopomap.org/" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🎨 Claro">
            <TileLayer
              attribution='© <a href="https://carto.com/" target="_blank" rel="noopener noreferrer">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          {showProductiveZones && (
            <LayersControl.Overlay checked name="📊 Zonas Productivas">
              <ProductiveZonesLayer points={heatmapPoints} />
            </LayersControl.Overlay>
          )}
        </LayersControl>

        <SearchToggleLeafletControl visible={!isSearchOpen} onOpen={handleOpenSearch} />

        <DrawingTools enabled={enableDrawing} onPolygonCreated={onPolygonCreated} />

        <MapLegend />
        <AttributionExternalLinks />

        <MarkerClusterGroup
          disableClusteringAtZoom={MAP_CONSTANTS.CLUSTER_DISABLE_ZOOM}
          iconCreateFunction={(cluster: L.MarkerCluster) =>
            createClusterIcon(cluster.getChildCount())
          }
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          maxClusterRadius={80}
        >
          {properties.map((property) => {
            // ✅ DEFENSIVE: Get crop info once per property to avoid repeated lookups
            const cropInfo = getCropInfo(property.crop);

            return (
              <Marker
                key={property.id}
                position={[property.lat, property.lng]}
                icon={createCropIcon(property.crop)}
                eventHandlers={{
                  popupopen: () => handlePopupOpen(property.id),
                  popupclose: handlePopupClose,
                }}
              >
                <Popup
                  maxWidth={520}
                  minWidth={450}
                  autoPan={true}
                  autoPanPadding={[50, 50]}
                  closeButton={false}
                  closeOnClick={false}
                  autoClose={true}
                >
                  <div
                    className="relative"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {/* Unified Close Button (same style as search banner) */}
                    <PopupCloseButton />

                    {/* Gallery Section */}
                    <div className="popup-gallery">
                      {property.images && property.images.length > 0 && (
                        <div style={{ margin: 0 }}>
                          <ImageGallery images={property.images} className="h-52" />
                        </div>
                      )}
                    </div>

                    {/* Header Section with Premium Gradient */}
                    <div
                      className="popup-header"
                      style={{
                        padding: '16px 20px 12px 20px',
                        background:
                          property.images && property.images.length > 0
                            ? 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(240,253,244,0.4) 100%)'
                            : 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                        borderBottom: '1px solid #E5E7EB',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                      >
                        <div
                          style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            width: '48px',
                            height: '48px',
                            background: `linear-gradient(135deg, ${cropInfo.color} 0%, ${cropInfo.color}DD 100%)`,
                            boxShadow: `0 4px 12px ${cropInfo.color}40`,
                            fontSize: '24px',
                          }}
                        >
                          {cropInfo.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              margin: '0 0 2px 0',
                              fontWeight: 700,
                              lineHeight: 1.2,
                              color: '#14532D',
                              fontSize: '17px',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {property.name}
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#6B7280',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>📍</span>
                            <span>
                              {property.municipality}, {property.department}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Details Section - Premium Grid Layout */}
                    <div
                      className="popup-details"
                      style={{
                        padding: '16px 20px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                      }}
                    >
                      {/* Owner Card */}
                      <div
                        style={{
                          background: '#F9FAFB',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          gridColumn: 'span 2',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '2px',
                          }}
                        >
                          👤 Propietario
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#111827',
                          }}
                        >
                          {property.owner}
                        </div>
                      </div>

                      {/* Crop Badge Card */}
                      <div
                        style={{
                          background: '#F9FAFB',
                          padding: '10px 12px',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '4px',
                          }}
                        >
                          🌱 Cultivo
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${cropInfo.color} 0%, ${cropInfo.color}CC 100%)`,
                            boxShadow: `0 2px 6px ${cropInfo.color}30`,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {cropInfo.displayName}
                        </span>
                      </div>

                      {/* Area Card */}
                      <div
                        style={{
                          background: '#F9FAFB',
                          padding: '10px 12px',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '2px',
                          }}
                        >
                          📐 Área
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#111827',
                          }}
                        >
                          {property.area}{' '}
                          <span style={{ color: '#6B7280', fontWeight: 500 }}>ha</span>
                        </div>
                      </div>

                      {/* Productivity Card with Visual Bar */}
                      <div
                        style={{
                          background: '#F9FAFB',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          gridColumn: 'span 2',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>📈 Productividad</span>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color:
                                property.productivity >= 70
                                  ? '#16A34A'
                                  : property.productivity >= 40
                                    ? '#CA8A04'
                                    : '#DC2626',
                            }}
                          >
                            {property.productivity}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            background: '#E5E7EB',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${property.productivity}%`,
                              background:
                                property.productivity >= 70
                                  ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                                  : property.productivity >= 40
                                    ? 'linear-gradient(90deg, #CA8A04, #EAB308)'
                                    : 'linear-gradient(90deg, #DC2626, #EF4444)',
                              borderRadius: '3px',
                              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Certification Card (if exists) - Highlighted in Gold */}
                      {property.certification && (
                        <div
                          style={{
                            gridColumn: 'span 2',
                            background:
                              'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: '1px solid #FCD34D',
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>✅</span>
                          <div>
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#92400E',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              Certificación
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#78350F',
                                textTransform: 'capitalize',
                              }}
                            >
                              {property.certification.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coordinates Footer - Monospace Technical Style */}
                    <div
                      className="popup-coords"
                      style={{
                        padding: '10px 20px',
                        background: '#F9FAFB',
                        borderTop: '1px solid #E5E7EB',
                        fontSize: '11px',
                        color: '#6B7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🎯</span>
                      <span>
                        {property.lat.toFixed(4)}°, {property.lng.toFixed(4)}°
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {properties
          .filter((p) => p.coordinates && p.coordinates.length > 0)
          .map((property) => {
            // ✅ DEFENSIVE: Get crop info once per property
            const cropInfo = getCropInfo(property.crop);

            return (
              <Polygon
                key={`polygon-${property.id}`}
                positions={property.coordinates!}
                pathOptions={{
                  color: cropInfo.color,
                  fillColor: cropInfo.color,
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              >
                <Popup
                  maxWidth={520}
                  minWidth={450}
                  autoPan={true}
                  autoPanPadding={[50, 50]}
                  closeButton={false}
                  closeOnClick={false}
                  autoClose={true}
                >
                  <div
                    className="relative"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {/* Unified Close Button */}
                    <PopupCloseButton />

                    {/* Polygon Header */}
                    <div
                      style={{
                        padding: '16px 20px 12px 20px',
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                        borderBottom: '1px solid #E5E7EB',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
                      >
                        <div
                          style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            width: '48px',
                            height: '48px',
                            background: `linear-gradient(135deg, ${cropInfo.color} 0%, ${cropInfo.color}DD 100%)`,
                            boxShadow: `0 4px 12px ${cropInfo.color}40`,
                            fontSize: '24px',
                          }}
                        >
                          {cropInfo.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#6B7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '2px',
                            }}
                          >
                            Parcela
                          </div>
                          <h3
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              lineHeight: 1.2,
                              color: '#14532D',
                              fontSize: '17px',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {property.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Polygon Detail */}
                    <div
                      style={{
                        padding: '16px 20px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                      }}
                    >
                      {/* Area */}
                      <div
                        style={{
                          background: '#F9FAFB',
                          padding: '10px 12px',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '2px',
                          }}
                        >
                          📐 Área
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#111827',
                          }}
                        >
                          {property.area}{' '}
                          <span style={{ color: '#6B7280', fontWeight: 500 }}>ha</span>
                        </div>
                      </div>

                      {/* Crop */}
                      <div
                        style={{
                          background: '#F9FAFB',
                          padding: '10px 12px',
                          borderRadius: '8px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '4px',
                          }}
                        >
                          🌱 Cultivo
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${cropInfo.color} 0%, ${cropInfo.color}CC 100%)`,
                            boxShadow: `0 2px 6px ${cropInfo.color}30`,
                            letterSpacing: '0.02em',
                          }}
                        >
                          {cropInfo.displayName}
                        </span>
                      </div>
                    </div>

                    {/* Coordinates Footer */}
                    <div
                      style={{
                        padding: '10px 20px',
                        background: '#F9FAFB',
                        borderTop: '1px solid #E5E7EB',
                        fontSize: '11px',
                        color: '#6B7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🎯</span>
                      <span>
                        {property.lat.toFixed(4)}°, {property.lng.toFixed(4)}°
                      </span>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
      </MapContainer>
    </div>
  );
}
