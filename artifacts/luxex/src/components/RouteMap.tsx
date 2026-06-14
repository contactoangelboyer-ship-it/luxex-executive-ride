import { useEffect, useRef, useState } from "react";

interface LatLng { lat: number; lon: number }

interface RouteMapProps {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  stops?: LatLng[];
  className?: string;
}

export interface RouteInfo {
  distanceMiles: number;
  durationMin: number;
  polyline: [number, number][];
}

function waitForLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).L?.map) { resolve(); return; }
    const interval = setInterval(() => {
      if ((window as any).L?.map) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

export async function fetchRoute(points: LatLng[]): Promise<RouteInfo | null> {
  if (points.length < 2) return null;
  try {
    const coords = points.map(p => `${p.lon},${p.lat}`).join(";");
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const distanceMiles = (route.distance / 1609.344) * 1.05;
    const durationMin = Math.round(route.duration / 60);
    const polyline: [number, number][] = (route.geometry?.coordinates ?? []).map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return { distanceMiles, durationMin, polyline };
  } catch {
    return null;
  }
}

function makeIcon(color: string, size = 18) {
  const L = (window as any).L;
  return L.divIcon({
    className: "",
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#000" stroke-width="2.5"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function RouteMap({ pickup, dropoff, stops = [], className = "" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let mounted = true;

    const init = async () => {
      await waitForLeaflet();
      if (!mounted || !mapRef.current || mapInstance.current) return;
      const L = (window as any).L;

      mapInstance.current = L.map(mapRef.current, {
        center: [40.7128, -74.006],
        zoom: 11,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(mapInstance.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapInstance.current);
    };

    init();

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    setRouteInfo(null);

    const allPoints: LatLng[] = [];
    if (pickup) allPoints.push(pickup);
    stops.forEach(s => allPoints.push(s));
    if (dropoff) allPoints.push(dropoff);

    if (pickup) {
      markersRef.current.push(
        L.marker([pickup.lat, pickup.lon], { icon: makeIcon("#F2E147") }).addTo(mapInstance.current)
      );
    }
    stops.forEach(s => {
      markersRef.current.push(
        L.marker([s.lat, s.lon], { icon: makeIcon("#a78bfa") }).addTo(mapInstance.current)
      );
    });
    if (dropoff) {
      markersRef.current.push(
        L.marker([dropoff.lat, dropoff.lon], { icon: makeIcon("#ffffff") }).addTo(mapInstance.current)
      );
    }

    if (allPoints.length >= 2) {
      setLoading(true);
      fetchRoute(allPoints).then(info => {
        setLoading(false);
        if (!info || !mapInstance.current) return;
        setRouteInfo(info);
        if (info.polyline.length > 0) {
          polylineRef.current = L.polyline(info.polyline, {
            color: "#F2E147",
            weight: 4,
            opacity: 0.9,
          }).addTo(mapInstance.current);
          mapInstance.current.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
        }
      });
    } else if (allPoints.length === 1) {
      mapInstance.current.setView([allPoints[0].lat, allPoints[0].lon], 14);
    }
  }, [pickup, dropoff, stops]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full" style={{ background: "#0a0a0a" }} />

      {loading && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/80 border border-white/10 px-3 py-1.5 text-[10px] text-white/50 font-bold uppercase tracking-widest z-[1000]">
          <span className="w-2 h-2 rounded-full bg-[#F2E147] animate-pulse" />
          Calculating route…
        </div>
      )}

      {routeInfo && !loading && (
        <div className="absolute top-3 left-3 flex items-center gap-3 bg-black/85 border border-white/10 px-3 py-2 backdrop-blur-sm z-[1000]">
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
    </div>
  );
}
