/**
 * Type declarations for react-leaflet-markercluster
 * Provides proper typing for the cluster object used in iconCreateFunction
 */

import 'leaflet';

declare module 'leaflet' {
  export interface MarkerCluster extends Marker {
    getChildCount(): number;
    getAllChildMarkers(): Marker[];
  }
}

declare module 'react-leaflet-markercluster/styles' {
  const styles: string;
  export default styles;
}
