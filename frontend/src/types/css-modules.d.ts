/**
 * CSS module declarations.
 *
 * CRITICAL: We use SPECIFIC module paths instead of `*.css`
 * to avoid conflicts with leaflet and react-leaflet type imports.
 */

declare module 'leaflet/dist/leaflet.css' {
  const styles: string;
  export default styles;
}

declare module 'leaflet-draw/dist/leaflet.draw.css' {
  const styles: string;
  export default styles;
}

declare module 'leaflet-geosearch/dist/geosearch.css' {
  const styles: string;
  export default styles;
}

declare module 'react-leaflet-markercluster/styles' {
  const styles: string;
  export default styles;
}
