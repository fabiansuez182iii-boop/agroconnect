/**
 * Custom Leaflet Draw hook with Spanish agricultural terminology.
 *
 * Overrides default Leaflet Draw English labels with custom Spanish labels
 * tailored for agricultural use cases.
 *
 * TO CUSTOMIZE LABELS:
 * Modify the strings in the L.drawLocal override below.
 * Each key corresponds to a specific drawing/editing action.
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface UseLeafletDrawProps {
  enabled: boolean;
  onPolygonCreated?: (coords: [number, number][]) => void;
}

export function useLeafletDraw({ enabled, onPolygonCreated }: UseLeafletDrawProps): void {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    // ============================================
    // 🎨 CUSTOMIZE DRAW TOOLBAR LABELS HERE
    // ============================================
    const drawLocalOverride = {
      draw: {
        toolbar: {
          buttons: {
            polyline: 'Trazar camino rural',
            polygon: 'Delimitar parcela agrícola',
            rectangle: 'Marcar zona rectangular',
            circle: 'Delimitar zona circular',
            marker: 'Marcar punto de interés',
            circlemarker: 'Marcar punto circular',
          },
          actions: {
            title: 'Cancelar dibujo',
            text: 'Cancelar',
          },
          finish: {
            title: 'Terminar dibujo',
            text: 'Terminar',
          },
          undo: {
            title: 'Borrar último punto',
            text: 'Borrar último punto',
          },
        },
        handlers: {
          circle: {
            tooltip: {
              start: 'Haz clic y arrastra para dibujar un círculo.',
            },
            radius: 'Radio',
          },
          circlemarker: {
            tooltip: {
              start: 'Haz clic en el mapa para colocar un marcador circular.',
            },
          },
          marker: {
            tooltip: {
              start: 'Haz clic en el mapa para colocar un marcador.',
            },
          },
          polygon: {
            tooltip: {
              start: 'Haz clic para comenzar a delimitar la parcela.',
              cont: 'Haz clic para continuar delimitando la parcela.',
              end: 'Haz clic en el primer punto para cerrar la parcela.',
            },
          },
          polyline: {
            error: '<strong>Error:</strong> los bordes no pueden cruzarse.',
            tooltip: {
              start: 'Haz clic para comenzar a trazar el camino.',
              cont: 'Haz clic para continuar trazando el camino.',
              end: 'Haz clic en el último punto para terminar el camino.',
            },
          },
          rectangle: {
            tooltip: {
              start: 'Haz clic y arrastra para dibujar un rectángulo.',
            },
          },
          simpleshape: {
            tooltip: {
              end: 'Suelta el ratón para terminar.',
            },
          },
        },
      },
      edit: {
        toolbar: {
          buttons: {
            edit: 'Modificar parcelas existentes',
            editDisabled: 'No hay parcelas para modificar',
            remove: 'Eliminar parcelas',
            removeDisabled: 'No hay parcelas para eliminar',
          },
          actions: {
            save: {
              title: 'Guardar cambios',
              text: 'Guardar',
            },
            cancel: {
              title: 'Cancelar edición',
              text: 'Cancelar',
            },
            clearAll: {
              title: 'Limpiar todas las parcelas',
              text: 'Limpiar todo',
            },
          },
        },
        handlers: {
          edit: {
            tooltip: {
              text: 'Arrastra los vértices o la parcela para modificarla.',
              subtext: 'Haz clic en Cancelar para deshacer los cambios.',
            },
          },
          remove: {
            tooltip: {
              text: 'Haz clic en una parcela para eliminarla.',
            },
          },
        },
      },
    };

    let drawControl: L.Control | null = null;
    let drawnItems: L.FeatureGroup | null = null;
    let eventHandler: ((e: L.LeafletEvent) => void) | null = null;
    let isMounted = true;

    const init = async (): Promise<void> => {
      await import('leaflet-draw');
      if (!isMounted) return;

      // CRITICAL: Apply override IMMEDIATELY after import, before creating any controls
      (L as unknown as Record<string, unknown>)['drawLocal'] = drawLocalOverride;

      drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#2E7D32',
              weight: 3,
              fillOpacity: 0.2,
            },
          },
          rectangle: {
            shapeOptions: {
              color: '#4CAF50',
              weight: 3,
              fillOpacity: 0.2,
            },
          },
          marker: {},
          polyline: false,
          circle: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItems,
        },
      });

      map.addControl(drawControl);

      eventHandler = (e: L.LeafletEvent): void => {
        const layer = (e as unknown as { layer: L.Layer }).layer;
        if (drawnItems) {
          drawnItems.addLayer(layer);
        }

        if (layer instanceof L.Polygon && onPolygonCreated) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          const coords: [number, number][] = latlngs.map((ll) => [ll.lat, ll.lng]);
          onPolygonCreated(coords);
        }
      };

      map.on(L.Draw.Event.CREATED, eventHandler);
    };

    void init();

    return () => {
      isMounted = false;
      if (eventHandler) {
        map.off(L.Draw.Event.CREATED, eventHandler);
      }
      if (drawControl) {
        try {
          map.removeControl(drawControl);
        } catch {
          // Ignore cleanup errors
        }
      }
      if (drawnItems) {
        try {
          map.removeLayer(drawnItems);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [map, enabled, onPolygonCreated]);
}
