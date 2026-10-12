import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Accident } from './AccidentLayer';

interface Props {
  accidents: Accident[];
}

export default function HeatLayer({ accidents }: Props) {
  const map = useMap();

  useEffect(() => {
    const points: Array<[number, number, number]> = accidents
      .filter(a => Array.isArray(a.location) && a.location.length === 2)
      .map(a => {
        const [lon, lat] = a.location;
        const intensity = a.death > 0 ? 1.0 : 0.5;
        return [lat, lon, intensity] as [number, number, number];
      });

    if (points.length === 0) return;

    const layer = L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 16,
      minOpacity: 0.3,
      gradient: {
        0.2: '#0ea5e9',
        0.5: '#f97316',
        0.8: '#7c3aed',
        1.0: '#ef4444',
      },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, accidents]);

  return null;
}
