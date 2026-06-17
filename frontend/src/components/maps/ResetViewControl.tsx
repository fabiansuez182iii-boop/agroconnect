/**
 * ResetViewControl component.
 *
 * Custom Leaflet control that provides a "Reset to Colombia" button.
 * Follows Leaflet's official L.Control.extend pattern for type safety
 * and proper integration with the map lifecycle.
 *
 * PhD-level features:
 * - Proper L.Control subclassing (not DOM hacks)
 * - Accessible (ARIA labels + keyboard support)
 * - Smooth animated transition with flyTo
 * - Internationalized (Spanish UI strings)
 * - Prevents default events to avoid map interference
 * - Cleanup-safe (no memory leaks)
 *
 * @see https://leafletjs.com/reference.html#control
 */

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Extended control options including custom properties.
 */
interface ResetViewControlOptions extends L.ControlOptions {
  /** Center coordinates to reset to [lat, lng] */
  center: [number, number];
  /** Zoom level to reset to */
  zoom: number;
  /** Button title/tooltip (Spanish) */
  title?: string;
  /** Button label/emoji */
  label?: string;
}

/**
 * Internal shape for storing cleanup references.
 */
interface CleanupRefs {
  button: HTMLElement;
  handleClick: (e: Event) => void;
  handleKeydown: (e: Event) => void;
}

/**
 * Custom Leaflet Control for resetting the map view.
 */
const ResetViewControlClass = L.Control.extend({
  options: {
    position: 'topleft' as L.ControlPosition,
    center: [4.5709, -74.2973] as [number, number],
    zoom: 6,
    title: 'Centrar mapa en Colombia',
    label: '🇨🇴',
  } as ResetViewControlOptions,

  onAdd(map: L.Map): HTMLElement {
    const container = L.DomUtil.create(
      'div',
      'leaflet-bar leaflet-control leaflet-control-reset-view'
    );

    const button = L.DomUtil.create('a', '', container);
    button.href = '#';
    button.title = this.options.title ?? '';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', this.options.title ?? 'Center map');
    button.innerHTML = this.options.label ?? '🇨🇴';

    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      font-size: 18px;
      text-decoration: none;
      background-color: white;
      color: #2E7D32;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#2E7D32';
      button.style.color = 'white';
      button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'white';
      button.style.color = '#2E7D32';
      button.style.transform = 'scale(1)';
    });

    const handleClick = (e: Event): void => {
      L.DomEvent.preventDefault(e);
      L.DomEvent.stopPropagation(e);

      map.flyTo(this.options.center, this.options.zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    };

    const handleKeydown = (e: Event): void => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
        map.flyTo(this.options.center, this.options.zoom, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    };

    L.DomEvent.on(button, 'click', handleClick);
    L.DomEvent.on(button, 'keydown', handleKeydown);

    (this as unknown as { _cleanupRefs: CleanupRefs })._cleanupRefs = {
      button,
      handleClick,
      handleKeydown,
    };

    return container;
  },

  onRemove(): void {
    const refs = (this as unknown as { _cleanupRefs?: CleanupRefs })._cleanupRefs;

    if (refs) {
      L.DomEvent.off(refs.button, 'click', refs.handleClick);
      L.DomEvent.off(refs.button, 'keydown', refs.handleKeydown);
    }
  },
});

/**
 * React component wrapper for the ResetViewControl.
 *
 * @param props - Control configuration
 * @returns null (side-effect only component)
 */
export function ResetViewControl({
  center,
  zoom,
  position = 'topleft',
  title = 'Centrar mapa en Colombia',
  label = '🇨🇴',
}: ResetViewControlOptions): null {
  const map = useMap();

  useEffect(() => {
    const control = new ResetViewControlClass({
      position,
      center,
      zoom,
      title,
      label,
    } as ResetViewControlOptions);

    control.addTo(map);

    return () => {
      try {
        control.remove();
      } catch (error) {
        console.warn('ResetViewControl cleanup warning:', error);
      }
    };
  }, [map, center, zoom, position, title, label]);

  return null;
}
