"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, NavigationControl, Popup } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Hospital } from "@/lib/types";

type Props = {
  hospitals: Hospital[];
};

type MappableHospital = Hospital & { lat: number; lon: number };

function toGeoJSON(hospitals: Hospital[]): GeoJSON.FeatureCollection {
  const mappable = hospitals.filter(
    (h): h is MappableHospital => h.lat != null && h.lon != null
  );
  return {
    type: "FeatureCollection",
    features: mappable.map((h) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: { slug: h.slug, name: h.name },
    })),
  };
}

export default function HospitalMap({ hospitals }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const first = hospitals.find((h) => h.lat != null && h.lon != null);
    const center: [number, number] = first
      ? [first.lon as number, first.lat as number]
      : [77.5946, 12.9716];

    const container = containerRef.current;
    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: "https://tiles.openfreemap.org/styles/positron",
        center,
        zoom: 10,
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not start the map (WebGL unsupported?).");
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");

    map.on("error", (e) => {
      setLoadError(e.error?.message ?? "The map failed to load.");
    });

    // MapLibre sizes its canvas from the container's dimensions at
    // construction time. This component is loaded via next/dynamic with
    // ssr:false, and can mount before its flex/grid parent has finished
    // laying out, so the container is sometimes 0x0 when the map is
    // constructed — the map "loads" but paints into an invisible canvas,
    // which looks like a blank white box. A ResizeObserver catches the
    // real size once layout settles and tells MapLibre to resize into it.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    map.on("load", () => {
      map.addSource("hospitals", {
        type: "geojson",
        data: toGeoJSON(hospitals),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "hospitals",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2563eb",
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
          "circle-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "hospitals",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "hospitals",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#dc2626",
          "circle-radius": 5,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = map.getSource("hospitals") as GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          map.easeTo({ center: coords, zoom });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const f = e.features?.[0];
        const coords = (f?.geometry as GeoJSON.Point | undefined)?.coordinates as
          | [number, number]
          | undefined;
        if (f?.properties?.name && coords) {
          new Popup()
            .setLngLat(coords)
            .setHTML(`<strong>${f.properties.name}</strong>`)
            .addTo(map);
        }
      });

      for (const layer of ["clusters", "unclustered-point"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      loadedRef.current = true;
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("hospitals") as GeoJSONSource | undefined;
    source?.setData(toGeoJSON(hospitals));
  }, [hospitals]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface p-4 text-center text-sm text-ink-500">
          Map couldn&apos;t load ({loadError}). The hospital list still works.
        </div>
      )}
    </div>
  );
}
