"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

interface Point { lat: number; lng: number; label?: string }

// latCol / lngCol ?� ?�도경도 모드?�서�??�용, 주소 모드?�서???�략 가??export default function MapView({ points, latCol, lngCol }: {
  points: Point[];
  latCol?: string;
  lngCol?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      // ?��? 초기?�된 컨테?�너 강제 ?�리
      const el = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (el._leaflet_id) {
        mapRef.current?.remove();
        mapRef.current = null;
        delete el._leaflet_id;
      }

      const displayed = points.slice(0, 500);
      const avgLat = displayed.reduce((s, p) => s + p.lat, 0) / displayed.length;
      const avgLng = displayed.reduce((s, p) => s + p.lng, 0) / displayed.length;

      const map = L.map(containerRef.current, { center: [avgLat, avgLng], zoom: 10 });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      displayed.forEach((p) => {
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 7,
          fillColor: "#0D7377",
          color: "#fff",
          weight: 2,
          fillOpacity: 0.85,
        }).addTo(map);

        if (p.label) {
          m.bindPopup(`<div style="font-size:12px;line-height:1.8">${p.label}</div>`, { maxWidth: 240 });
        }
      });

      if (displayed.length > 1) {
        const bounds = L.latLngBounds(displayed.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 200);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [points]);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="font-semibold text-neutral-800">지???�각??/h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {latCol && lngCol ? `${latCol}(?�도) · ${lngCol}(경도) · ` : "주소 지?�코??· "}
          {points.length.toLocaleString()}�?지??          {points.length > 500 && <span className="text-amber-500 ml-1">· 최�? 500�??�시</span>}
        </p>
      </div>
      <div ref={containerRef} style={{ height: 520, width: "100%" }} />
    </div>
  );
}
