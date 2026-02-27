import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

interface DriverMapProps {
  driverId: string | null;
  deliveryAddress: string;
}

export function DriverMap({ driverId, deliveryAddress }: DriverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);

  // Poll driver location every 5s
  useEffect(() => {
    if (!driverId) return;

    const fetchLocation = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("current_lat, current_lng, name")
        .eq("id", driverId)
        .maybeSingle();
      if (data?.current_lat && data?.current_lng) {
        setDriverPos({ lat: Number(data.current_lat), lng: Number(data.current_lng) });
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000);

    // Also listen for realtime updates
    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "delivery_drivers",
        filter: `id=eq.${driverId}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row.current_lat && row.current_lng) {
          setDriverPos({ lat: Number(row.current_lat), lng: Number(row.current_lng) });
        }
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [-15.7801, -47.9292], // Default: Brasília
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update marker when position changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !driverPos) return;

    const driverIcon = L.divIcon({
      className: "driver-marker",
      html: `<div style="width:36px;height:36px;border-radius:50%;background:hsl(var(--primary));display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;font-size:18px;">🛵</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([driverPos.lat, driverPos.lng]);
    } else {
      markerRef.current = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
        .addTo(map)
        .bindPopup("🛵 Entregador");
    }

    map.panTo([driverPos.lat, driverPos.lng], { animate: true });
  }, [driverPos]);

  if (!driverId) {
    return (
      <div className="h-48 rounded-xl bg-secondary/50 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Aguardando entregador ser atribuído...</p>
      </div>
    );
  }

  if (!driverPos) {
    return (
      <div className="h-48 rounded-xl bg-secondary/50 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Aguardando localização do entregador...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div ref={mapRef} className="h-64 w-full" />
    </div>
  );
}
