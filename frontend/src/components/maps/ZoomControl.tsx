/**
 * ZoomControl component.
 *
 * Custom zoom control for Leaflet with Spanish translations.
 * Replaces the default "Zoom in" / "Zoom out" with "Acercar" / "Alejar".
 *
 * PhD-level implementation:
 * - Proper L.Control.Zoom instantiation
 * - Accessible (ARIA labels in Spanish)
 * - Type-safe with TypeScript
 * - Follows AgroConnect design system
 *
 * @see https://leafletjs.com/reference.html#control-zoom
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Configuration options for the custom zoom control.
 */
export interface CustomZoomControlOptions {
  /** Position on the map */
  position?: L.ControlPosition;
  /** Text for zoom in button */
  zoomInText?: string;
  /** Title/tooltip for zoom in button */
  zoomInTitle?: string;
  /** Text for zoom out button */
  zoomOutText?: string;
  /** Title/tooltip for zoom out button */
  zoomOutTitle?: string;
}

/**
 * React component wrapper for a custom Leaflet zoom control.
 *
 * @param props - Control configuration
 * @returns null (side-effect only component)
 */
export function CustomZoomControl({
  position = 'topleft',
  zoomInText = '+',
  zoomInTitle = 'Acercar',
  zoomOutText = '−',
  zoomOutTitle = 'Alejar',
}: CustomZoomControlOptions): null {
  const map = useMap();

  useEffect(() => {
    const zoomControl = new L.Control.Zoom({
      position,
      zoomInText,
      zoomInTitle,
      zoomOutText,
      zoomOutTitle,
    });

    zoomControl.addTo(map);

    return () => {
      try {
        zoomControl.remove();
      } catch (error) {
        console.warn('CustomZoomControl cleanup warning:', error);
      }
    };
  }, [map, position, zoomInText, zoomInTitle, zoomOutText, zoomOutTitle]);

  return null;
}
