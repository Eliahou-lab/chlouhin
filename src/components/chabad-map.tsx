"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@/utils/supabase/client";

interface BethHabad {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  slug: string;
}

export default function ChabadMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [bethHabads, setBethHabads] = useState<BethHabad[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Beth Habad data from Supabase
  useEffect(() => {
    async function fetchBethHabads() {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("beth_habad")
        .select("id, name, city, country, lat, lng, slug")
        .not("lat", "is", null)
        .not("lng", "is", null);

      if (error) {
        console.error("Error fetching Beth Habad:", error);
        return;
      }

      if (data) {
        const validData = data.filter(
          (item): item is BethHabad => 
            item.lat !== null && 
            item.lng !== null &&
            typeof item.lat === "number" &&
            typeof item.lng === "number"
        );
        setBethHabads(validData);
      }
      
      setLoading(false);
    }

    fetchBethHabads();
  }, []);

  // Initialize map with ResizeObserver to ensure container has dimensions
  useEffect(() => {
    if (loading) return; // Don't initialize while loading
    
    if (!mapContainer.current) {
      console.log("Map container ref not found");
      return;
    }

    const container = mapContainer.current;
    console.log("Container ref found, waiting for dimensions...");
    console.log("Initial dimensions:", {
      width: container.offsetWidth,
      height: container.offsetHeight
    });

    let resizeObserver: ResizeObserver | null = null;
    let timer: NodeJS.Timeout | null = null;

    const initializeMap = () => {
      if (map.current) {
        console.log("Map already initialized");
        return;
      }

      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.log("Container has no dimensions yet, waiting...");
        return;
      }

      console.log("Initializing Maplibre map...");
      console.log("Container dimensions:", {
        width: container.offsetWidth,
        height: container.offsetHeight
      });

      try {
        map.current = new maplibregl.Map({
          container: container,
          style: "https://demotiles.maplibre.org/style.json",
          center: [0, 20],
          zoom: 2,
          minZoom: 1,
          maxZoom: 18,
        });

        map.current.on("load", () => {
          console.log("Map loaded successfully");
        });

        map.current.on("error", (e) => {
          console.error("Map error:", e);
        });

        // Add navigation controls
        map.current.addControl(
          new maplibregl.NavigationControl(),
          "top-right"
        );

        // Add attribution
        map.current.addControl(
          new maplibregl.AttributionControl({
            compact: true,
          })
        );
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }

      // Cleanup
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    // Try immediately if dimensions are available
    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
      initializeMap();
    } else {
      // Use ResizeObserver to wait for dimensions
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            console.log("Container now has dimensions:", entry.contentRect);
            initializeMap();
            break;
          }
        }
      });

      resizeObserver.observe(container);

      // Fallback: try after 500ms even if no resize event
      timer = setTimeout(() => {
        console.log("Timeout fallback, trying initialization...");
        initializeMap();
      }, 500);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (timer) {
        clearTimeout(timer);
      }
      map.current?.remove();
      map.current = null;
    };
  }, [loading]);

  // Add markers when data is loaded
  useEffect(() => {
    if (!map.current || bethHabads.length === 0) return;

    // Remove existing markers
    const markers = document.querySelectorAll(".maplibregl-marker");
    markers.forEach((marker) => marker.remove());

    // Add markers for each Beth Habad
    bethHabads.forEach((bethHabad) => {
      if (!map.current) return;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-gray-900 mb-1">${bethHabad.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${bethHabad.city}, ${bethHabad.country}</p>
          <a 
            href="/beth-habad/${bethHabad.slug}" 
            class="inline-block px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Voir le profil
          </a>
        </div>
      `);

      const marker = new maplibregl.Marker({
        color: "#2563eb",
        scale: 0.8,
      })
        .setLngLat([bethHabad.lng, bethHabad.lat])
        .setPopup(popup)
        .addTo(map.current);
    });
  }, [bethHabads]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Chargement des Beth Habad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: '100vh' }}>
      <div 
        ref={mapContainer} 
        className="w-full"
        style={{ height: '100%', width: '100%', minHeight: '100vh' }}
      />
      
      {/* Overlay with stats */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10">
        <h2 className="text-lg font-semibold text-gray-900">Carte des Beth Habad</h2>
        <p className="text-sm text-gray-600 mt-1">
          {bethHabads.length} centres affichés
        </p>
      </div>
    </div>
  );
}
