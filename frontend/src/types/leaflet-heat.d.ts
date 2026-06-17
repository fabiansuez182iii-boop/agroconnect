/**
 * Ambient module declaration for leaflet.heat v0.2.0
 *
 * CRITICAL: This file must NOT have any top-level imports or exports.
 * If it did, TypeScript would treat it as a module and the `declare module`
 * statements below would become module augmentations instead of new
 * module declarations, causing TS7016 errors on dynamic imports.
 *
 * @see https://github.com/Leaflet/Leaflet.heat
 */

declare module 'leaflet.heat' {
  const leafletHeat: unknown;
  export default leafletHeat;
}

declare namespace L {
  export type HeatLatLngTuple = [number, number] | [number, number, number];

  export interface HeatMapOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  export interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatMapOptions): this;
    redraw(): this;
    addTo(map: L.Map): this;
  }

  export function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatMapOptions
  ): HeatLayer;
}
