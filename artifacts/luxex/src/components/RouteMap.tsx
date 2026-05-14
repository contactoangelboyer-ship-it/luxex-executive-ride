import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

interface LatLng { lat: number; lon: number }

interface RouteMapProps {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  stops?: LatLng[];
  className?: string;
}

interface RouteInfo {
  distanceMiles: number;
  durationMin: number;
  polyline: [number, number][];
}

let L: any = null;

async function fetchRoute(points: LatLng[]): Promise<RouteInfo | null> {
  if (points.length < 2) return null;
  try {
    const coords = points.map(p => `${p.lon},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    const distanceMiles = (route.distance / 1609.344) * 1.05;
    const durationMin = Math.round(route.duration / 60);
    const polyline: [number, number][] = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
    return { distanceMiles, durationMin, polyline };
  } catch {
    return null;
  }
}

function pickupIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:#F2E147;border:3px solid #000;border-radius:50%;box-shadow:0 0 0 2px #F2E147"></div>`,
    iconAnchor: [7, 7],
  });
}

function dropoffIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;background:#fff;border:3px solid #000;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,0.5)"></div>`,
    iconAnchor: [7, 7],
  });
}

function stopIcon(index: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;background:#a78bfa;border:2px solid #000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:#000;line-height:1">${index + 1}</div>`,
    iconAnchor: [6, 6],
  });
}

export function RouteMap({ pickup, dropoff, stops = [], className = "" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let mounted = true;

    const init = async () => {
      if (!L) L = (await import("leaflet")).default;
      if (!mounted || !mapRef.current) return;
      if (mapInstance.current) return;

      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([40.7128, -74.006], 11);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(mapInstance.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapInstance.current);
    };

    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !L) return;

    markers.current.forEach(m => m.remove());
    markers.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    setRouteInfo(null);

    const allPoints: LatLng[] = [];
    if (pickup) allPoints.push(pickup);
    stops.forEach(s => allPoints.push(s));
    if (dropoff) allPoints.push(dropoff);

    if (pickup) {
      const m = L.marker([pickup.lat, pickup.lon], { icon: pickupIcon() }).addTo(mapInstance.current);
      m.bindTooltip("Pickup", { className: "leaflet-dark-tip", direction: "top" });
      markers.current.push(m);
    }

    stops.forEach((s, i) => {
      const m = L.marker([s.lat, s.lon], { icon: stopIcon(i) }).addTo(mapInstance.current);
      m.bindTooltip(`Stop ${i + 1}`, { direction: "top" });
      markers.current.push(m);
    });

    if (dropoff) {
      const m = L.marker([dropoff.lat, dropoff.lon], { icon: dropoffIcon() }).addTo(mapInstance.current);
      m.bindTooltip("Drop-off", { direction: "top" });
      markers.current.push(m);
    }

    if (allPoints.length >= 2) {
      setLoading(true);
      fetchRoute(allPoints).then(info => {
        if (!mapInstance.current) return;
        if (info && info.polyline.length > 0) {
          polylineRef.current = L.polyline(info.polyline, {
            color: "#F2E147",
            weight: 4,
            opacity: 0.9,
          }).addTo(mapInstance.current);
          setRouteInfo(info);
          const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lon]));
          mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
        } else {
          const bounds = L.latLngBounds(allPoints.map(p => [p.lat, p.lon]));
          mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }).finally(() => setLoading(false));
    } else if (allPoints.length === 1) {
      mapInstance.current.setView([allPoints[0].lat, allPoints[0].lon], 13);
    }
  }, [pickup, dropoff, stops]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" style={{ background: "#0a0a0a" }} />

      {loading && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-1.5 text-[10px] text-white/50 font-bold uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-[#F2E147] animate-pulse" />
          Calculating route…
        </div>
      )}

      {routeInfo && !loading && (
        <div className="absolute top-3 left-3 flex items-center gap-3 bg-black/85 border border-white/10 px-3 py-2 backdrop-blur-sm">
          <div className="text-center">
            <p className="font-black text-base text-[#F2E147] leading-none">{routeInfo.distanceMiles.toFixed(1)}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-0.5">miles</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <p className="font-black text-base text-white leading-none">{routeInfo.durationMin}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-0.5">min</p>
          </div>
          {stops.length > 0 && (
            <>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="font-black text-base text-purple-300 leading-none">{stops.length}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold mt-0.5">stops</p>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .leaflet-dark-tip {
          background: #111 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: rgba(255,255,255,0.6) !important;
          font-size: 10px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-radius: 0 !important;
          padding: 4px 8px !important;
        }
        .leaflet-tooltip-top.leaflet-dark-tip::before { border-top-color: rgba(255,255,255,0.1) !important; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom a {
          background: #111 !important;
          color: rgba(255,255,255,0.4) !important;
          border-color: rgba(255,255,255,0.1) !important;
          border-radius: 0 !important;
          font-family: 'DM Sans', sans-serif;
        }
        .leaflet-control-zoom a:hover { background: #222 !important; color: #fff !important; }
      `}</style>
    </div>
  );
}

export { type RouteInfo, fetchRoute };
