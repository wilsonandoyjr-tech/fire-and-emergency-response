import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  color?: string;
  label?: string;
  onClick?: () => void;
};

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  points?: MapPoint[];
  fitToPoints?: boolean;
  onMapReady?: (map: L.Map) => void;
}

function createDivIcon(point: MapPoint) {
  const color = point.color ?? "#f97316";

  return L.divIcon({
    className: "",
    html: `
      <button
        type="button"
        title="${point.title ?? ""}"
        style="
          width:38px;
          height:38px;
          border-radius:999px;
          border:3px solid rgba(255,255,255,.78);
          background:${color};
          color:white;
          display:grid;
          place-items:center;
          font-weight:800;
          box-shadow:0 0 22px ${color}80;
          cursor:pointer;
        "
      >${point.label ?? ""}</button>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

export function MapView({
  className,
  initialCenter = { lat: 7.9043, lng: 125.0928 },
  initialZoom = 13,
  points = [],
  fitToPoints = true,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    onMapReady?.(map.current);

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, onMapReady]);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    const bounds: L.LatLngExpression[] = [];

    points.forEach((point) => {
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;

      const marker = L.marker([point.lat, point.lng], {
        icon: createDivIcon(point),
        title: point.title,
      });

      if (point.title) marker.bindPopup(point.title);
      if (point.onClick) marker.on("click", point.onClick);

      marker.addTo(map.current!);
      markers.current.push(marker);
      bounds.push([point.lat, point.lng]);
    });

    if (fitToPoints && bounds.length > 0) {
      map.current.fitBounds(L.latLngBounds(bounds), {
        padding: [56, 56],
        maxZoom: initialZoom,
      });
    }
  }, [fitToPoints, initialZoom, points]);

  return <div ref={mapContainer} className={cn("h-[500px] w-full", className)} />;
}
