"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Map as MapLibreMap, NavigationControl, Popup } from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Callout } from "@/components/ui/Callout";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** The only fields the map needs; the city page passes its filtered rows. */
export type MapHospital = { slug: string; name: string; lat: number | null; lon: number | null };

type Props = {
  hospitals: MapHospital[];
  citySlug: string;
};

type Mappable = MapHospital & { lat: number; lon: number };

const BASE = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "static" ? "/medcost-india" : "";
// Positron in BOTH themes (spec §0.2): the page is list-first, so the map is
// low-stakes, and the fixed --map-* tokens are tuned for these light tiles.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
// The font Positron itself uses, so the cluster counts never request a
// fontstack the OpenFreeMap glyph server doesn't have.
const COUNT_FONT = ["Noto Sans Regular"];

function isMappable(h: MapHospital): h is Mappable {
  return h.lat != null && h.lon != null;
}

function toGeoJSON(hospitals: MapHospital[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: hospitals.filter(isMappable).map((h) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [h.lon, h.lat] },
      properties: { slug: h.slug, name: h.name },
    })),
  };
}

/** Median point: one bad coordinate can't drag the first view off the city. */
function medianCenter(hospitals: MapHospital[]): [number, number] | null {
  const pts = hospitals.filter(isMappable);
  if (pts.length === 0) return null;
  const mid = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  return [mid(pts.map((h) => h.lon)), mid(pts.map((h) => h.lat))];
}

/** Map colours come from the --map-* tokens in app/globals.css, never literals. */
function mapColours() {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    pin: read("--map-pin", "black"),
    cluster: read("--map-cluster", "black"),
    onPin: read("--map-on-pin", "white"),
    stroke: read("--map-stroke", "white"),
  };
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function HospitalMap({ hospitals, citySlug }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  // Latest values for the map's event handlers, which are bound once.
  const hospitalsRef = useRef(hospitals);
  const tRef = useRef(t);
  const routerRef = useRef(router);
  const cityRef = useRef(citySlug);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    tRef.current = t;
    routerRef.current = router;
    cityRef.current = citySlug;
  }, [t, router, citySlug]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const initial = hospitalsRef.current;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: STYLE_URL,
        center: medianCenter(initial) ?? [77.5946, 12.9716],
        zoom: 10,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
    } catch {
      // No WebGL (or it is switched off): show the fallback; the list still
      // works. Deferred a tick so the effect body never sets state itself.
      const id = window.setTimeout(() => setFailed(true), 0);
      return () => window.clearTimeout(id);
    }
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    // A failure before the first full render (style or tiles blocked, no
    // WebGL context) gets the visible fallback. After that, one flaky tile on
    // a slow connection must not cover a map that is otherwise working.
    map.on("error", () => {
      if (!loadedRef.current) setFailed(true);
    });
    map.on("webglcontextlost", () => setFailed(true));

    // MapLibre sizes its canvas from the container's dimensions at
    // construction time. This component is loaded via next/dynamic with
    // ssr:false, and can mount before its flex/grid parent has finished
    // laying out, so the container is sometimes 0x0 when the map is
    // constructed — the map "loads" but paints into an invisible canvas,
    // which looks like a blank white box. A ResizeObserver catches the
    // real size once layout settles and tells MapLibre to resize into it.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    let popup: Popup | null = null;

    function openPopup(feature: MapGeoJSONFeature) {
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const slug = String(feature.properties?.slug ?? "");
      const name = String(feature.properties?.name ?? "");
      if (!slug) return;
      const path = `/hospitals/${cityRef.current}/${slug}`;

      // Built with createElement + textContent: hospital names are source
      // data and never go through innerHTML.
      const box = document.createElement("div");
      const title = document.createElement("p");
      title.className = "text-headline text-label";
      title.setAttribute("translate", "no");
      title.textContent = name;
      const link = document.createElement("a");
      link.href = `${BASE}${path}`; // a real, basePath-aware URL (new tab, copy link)
      link.className =
        "mt-1 inline-flex min-h-11 items-center text-callout font-medium text-accent underline decoration-1 underline-offset-2 hover:text-accent-hover";
      link.textContent = tRef.current("city.viewHospital");
      link.addEventListener("click", (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        routerRef.current.push(path); // client navigation; next/navigation adds the basePath
      });
      box.append(title, link);

      popup?.remove();
      popup = new Popup({ closeButton: false, offset: 14, maxWidth: "260px" })
        .setLngLat(coords)
        .setDOMContent(box)
        .addTo(map);

      // MapLibre's popup CSS is white and unlayered. Inline role tokens make it
      // follow the page theme, so text-label is never light-on-white in dark
      // mode. The tip is hidden: its colour depends on the anchor side.
      const el = popup.getElement();
      const content = el?.querySelector<HTMLElement>(".maplibregl-popup-content");
      if (content) {
        content.style.background = "var(--elevated)";
        content.style.color = "var(--label)";
        content.style.borderRadius = "var(--radius-control)";
        content.style.boxShadow = "var(--elev-pop)";
        content.style.padding = "12px 16px 4px";
        content.style.fontFamily = "var(--font-stack)";
      }
      const tip = el?.querySelector<HTMLElement>(".maplibregl-popup-tip");
      if (tip) tip.style.display = "none";
    }

    map.on("load", () => {
      const colour = mapColours();
      map.addSource("hospitals", {
        type: "geojson",
        data: toGeoJSON(hospitalsRef.current),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
      });
      // Invisible, larger hit area under each pin: a 14px dot is hard to tap.
      map.addLayer({
        id: "pin-hit",
        type: "circle",
        source: "hospitals",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 18, "circle-opacity": 0 },
      });
      map.addLayer({
        id: "pins",
        type: "circle",
        source: "hospitals",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": colour.pin,
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": colour.stroke,
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "hospitals",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": colour.cluster,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": colour.stroke,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "hospitals",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": COUNT_FONT,
          "text-size": 13,
        },
        paint: { "text-color": colour.onPin },
      });

      // One handler, top-most feature wins, so a tap never both zooms a
      // cluster and opens a popup.
      map.on("click", (e) => {
        const feature = map.queryRenderedFeatures(e.point, { layers: ["clusters", "pin-hit"] })[0];
        if (!feature) return;
        if (feature.layer.id === "clusters") {
          const clusterId = feature.properties?.cluster_id;
          if (clusterId == null) return;
          const center = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          const source = map.getSource("hospitals") as GeoJSONSource;
          source
            .getClusterExpansionZoom(clusterId)
            .then((zoom) => map.easeTo({ center, zoom, duration: reducedMotion() ? 0 : 300 }))
            .catch(() => {});
          return;
        }
        openPopup(feature);
      });

      for (const layer of ["clusters", "pin-hit"]) {
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
      popup?.remove();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // The filter on the city page changes the pins without rebuilding the map.
  useEffect(() => {
    hospitalsRef.current = hospitals;
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource("hospitals") as GeoJSONSource | undefined;
    source?.setData(toGeoJSON(hospitals));
  }, [hospitals]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface p-4">
          <div role="status" className="max-w-[40ch]">
            <Callout>{t("city.mapFailed")}</Callout>
          </div>
        </div>
      )}
    </div>
  );
}
