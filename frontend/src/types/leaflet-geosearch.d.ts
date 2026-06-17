/**
 * Ambient module declaration for leaflet-geosearch.
 *
 * CRITICAL: We MUST NOT use `import * as L from 'leaflet'` inside
 * this `declare module` block, because that would convert this
 * ambient declaration into a module augmentation that conflicts
 * with the react-leaflet types.
 *
 * We use `any` only for the L.Control/L.Map types that come from
 * the leaflet package. The rest is strongly typed.
 */

declare module 'leaflet-geosearch' {
  export interface SearchResultRaw {
    [key: string]: unknown;
  }

  export interface SearchResult {
    x: number;
    y: number;
    label: string;
    bounds: [number, number][];
    raw: SearchResultRaw;
  }

  export interface SearchProvider {
    search(options: { query: string }): Promise<SearchResult[]>;
  }

  export class OpenStreetMapProvider implements SearchProvider {
    constructor(options?: Record<string, unknown>);
    search(options: { query: string }): Promise<SearchResult[]>;
  }

  export class GoogleProvider implements SearchProvider {
    constructor(options?: Record<string, unknown>);
    search(options: { query: string }): Promise<SearchResult[]>;
  }

  export interface SearchControlOptions {
    provider: SearchProvider;
    style?: 'bar' | 'button';
    searchLabel?: string;
    autoClose?: boolean;
    showMarker?: boolean;
    keepResult?: boolean;
    retainZoomLabel?: boolean;
    animateZoom?: boolean;
    marker?: Record<string, unknown>;
    notFoundMessage?: string;
    position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  }

  /**
   * Main search control class.
   * Compatible with Leaflet's L.Control interface.
   */
  export class SearchControl {
    constructor(options: SearchControlOptions);
    addTo(map: unknown): this;
    removeFrom(map: unknown): this;
    onAdd(map: unknown): HTMLElement;
    onRemove(map: unknown): void;
    open(): void;
    close(): void;
  }

  export { SearchControl as GeoSearchControl };
}
