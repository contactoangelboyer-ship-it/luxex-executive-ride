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

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0e0e0e" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#444444" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#111111" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#444444" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#222222" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#111111" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#111111" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#333333" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#050505" }] },
];

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps) { resolve(); return; }
    const interval = setInterval(() => {
      if ((window as any).google?.maps) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

export async function fetchRoute(points: LatLng[]): Promise<RouteInfo | null> {
  if (points.length < 2) return null;
  try {
    await waitForGoogleMaps();
    const goog = (window as any).google;
    if (!goog?.maps) return null;

    return new Promise((resolve) => {
      const service = new goog.maps.DirectionsService();
      const origin = { lat: points[0].lat, lng: points[0].lon };
      const destination = { lat: points[points.length - 1].lat, lng: points[points.length - 1].lon };
      const waypoints = points.slice(1, -1).map((p: LatLng) => ({
        location: { lat: p.lat, lng: p.lon },
        stopover: true,
      }));

      service.route(
        { origin, destination, waypoints, travelMode: goog.maps.TravelMode.DRIVING },
        (result: any, status: string) => {
          if (status !== "OK" || !result?.routes?.[0]) { resolve(null); return; }
          const route = result.routes[0];
          let distanceMeters = 0;
          let durationSeconds = 0;
          route.legs.forEach((leg: any) => {
            distanceMeters += leg.distance.value;
            durationSeconds += leg.duration.value;
          });
          const distanceMiles = (distanceMeters / 1609.344) * 1.05;
          const durationMin = Math.round(durationSeconds / 60);
          resolve({ distanceMiles, durationMin, polyline: [] });
        }
      );
    });
  } catch {
    return null;
  }
}

export function RouteMap({ pickup, dropoff, stops = [], className = "" }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let mounted = true;

    const init = async () => {
      await waitForGoogleMaps();
      if (!mounted || !mapRef.current || mapInstance.current) return;
      const goog = (window as any).google;

      mapInstance.current = new goog.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 11,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: goog.maps.ControlPosition.RIGHT_BOTTOM },
        gestureHandling: "cooperative",
      });

      directionsRenderer.current = new goog.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#F2E147",
          strokeWeight: 4,
          strokeOpacity: 0.9,
        },
      });
      directionsRenderer.current.setMap(mapInstance.current);
    };

    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const goog = (window as any).google;
    if (!mapInstance.current || !goog?.maps) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    setRouteInfo(null);

    const allPoints: LatLng[] = [];
    if (pickup) allPoints.push(pickup);
    stops.forEach(s => allPoints.push(s));
    if (dropoff) allPoints.push(dropoff);

    if (pickup) {
      const marker = new goog.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lon },
        map: mapInstance.current,
        icon: {
          path: goog.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#F2E147",
          fillOpacity: 1,
          strokeColor: "#000000",
          strokeWeight: 3,
        },
        title: "Pickup",
        zIndex: 10,
      });
      markersRef.current.push(marker);
    }

    stops.forEach((s, i) => {
      const marker = new goog.maps.Marker({
        position: { lat: s.lat, lng: s.lon },
        map: mapInstance.current,
        icon: {
          path: goog.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#a78bfa",
          fillOpacity: 1,
          strokeColor: "#000000",
          strokeWeight: 2,
        },
        label: { text: String(i + 1), color: "#000000", fontSize: "8px", fontWeight: "900" },
        title: `Stop ${i + 1}`,
        zIndex: 9,
      });
      markersRef.current.push(marker);
    });

    if (dropoff) {
      const marker = new goog.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lon },
        map: mapInstance.current,
        icon: {
          path: goog.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: "#000000",
          strokeWeight: 3,
        },
        title: "Drop-off",
        zIndex: 10,
      });
      markersRef.current.push(marker);
    }

    if (allPoints.length >= 2) {
      setLoading(true);
      const service = new goog.maps.DirectionsService();
      const origin = { lat: allPoints[0].lat, lng: allPoints[0].lon };
      const destination = { lat: allPoints[allPoints.length - 1].lat, lng: allPoints[allPoints.length - 1].lon };
      const waypoints = allPoints.slice(1, -1).map((p: LatLng) => ({
        location: { lat: p.lat, lng: p.lon },
        stopover: true,
      }));

      service.route(
        { origin, destination, waypoints, travelMode: goog.maps.TravelMode.DRIVING },
        (result: any, status: string) => {
          setLoading(false);
          if (status === "OK" && directionsRenderer.current && result?.routes?.[0]) {
            directionsRenderer.current.setDirections(result);
            const route = result.routes[0];
            let distanceMeters = 0;
            let durationSeconds = 0;
            route.legs.forEach((leg: any) => {
              distanceMeters += leg.distance.value;
              durationSeconds += leg.duration.value;
            });
            setRouteInfo({
              distanceMiles: (distanceMeters / 1609.344) * 1.05,
              durationMin: Math.round(durationSeconds / 60),
              polyline: [],
            });
          } else {
            if (directionsRenderer.current) directionsRenderer.current.setDirections({ routes: [] });
            const bounds = new goog.maps.LatLngBounds();
            allPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
            mapInstance.current.fitBounds(bounds, 50);
          }
        }
      );
    } else {
      if (directionsRenderer.current) directionsRenderer.current.setDirections({ routes: [] });
      if (allPoints.length === 1) {
        mapInstance.current.setCenter({ lat: allPoints[0].lat, lng: allPoints[0].lon });
        mapInstance.current.setZoom(14);
      }
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
    </div>
  );
}
