/**
 * Map icon utilities for AgroConnect.
 *
 * Architecture (v3.0 - Geometrically precise anchors):
 * - iconAnchor at CENTER of circle (20, 20) for accurate map positioning
 * - popupAnchor at [0, -20] for popup glued to top edge of circle
 * - Solid colored circles with emoji for each crop type
 * - Subtle shadow and white border for premium visual quality
 */

import L from 'leaflet';
import type { CropType } from '../types/property';
import { CROP_CATALOG } from '../types/property';

/**
 * Creates a custom marker icon for a specific crop type.
 *
 * Geometry:
 * - Icon size: 40x40px (circle)
 * - iconAnchor: [20, 20] → center of circle (map reference point)
 * - popupAnchor: [0, -20] → popup base at top edge of circle
 */
export function createCropIcon(crop: CropType): L.DivIcon {
  const cropInfo = CROP_CATALOG[crop];

  return L.divIcon({
    className: 'custom-crop-marker',
    html: `
      <div style="
        background: ${cropInfo.color};
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15);
        border: 2.5px solid white;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      ">
        ${cropInfo.emoji}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

/**
 * Creates a cluster icon showing the count of grouped markers.
 * Premium gradient design with dynamic sizing based on count.
 */
export function createClusterIcon(count: number): L.DivIcon {
  const size = count < 10 ? 44 : count < 100 ? 52 : 62;
  const fontSize = count < 10 ? 16 : count < 100 ? 18 : 20;

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `
      <div style="
        background: linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%);
        color: white;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(46, 125, 50, 0.4), 0 2px 4px rgba(0,0,0,0.2);
        border: 3px solid white;
        letter-spacing: -0.5px;
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
