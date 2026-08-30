"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const first = hospitals.find((h) => h.lat != null && h.lon != null);
    const center: [number, number] = first
      ? [first.lon as number, first.lat as number]
      : [77.5946, 12.9716];

    const map = new MapLibreMap({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center,
      zoom: 10,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");

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

  return <div ref={containerRef} className="h-full w-full" />;
}
