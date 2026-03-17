"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";

type RibLocation = {
  id: string;
  label: string;
  location: string;
  lat: number;
  lon: number;
};

const RIB_LOCATIONS: RibLocation[] = [
  { id: "portimao", label: "Portimão", location: "Portimão", lat: 37.14, lon: -8.53 },
  { id: "cadiz", label: "Cádiz", location: "Cadiz", lat: 36.53, lon: -6.29 },
  { id: "palma", label: "Palma", location: "Palma", lat: 39.57, lon: 2.65 },
  { id: "girona", label: "Girona", location: "Girona", lat: 41.98, lon: 2.82 },
  { id: "hyeres", label: "Hyères", location: "Hyeres", lat: 43.12, lon: 6.13 },
  { id: "garda", label: "Garda", location: "Garda", lat: 45.54, lon: 10.74 },
  { id: "weymouth", label: "Weymouth", location: "Weymouth", lat: 50.61, lon: -2.45 },
  { id: "kiel", label: "Kiel", location: "Kiel", lat: 54.32, lon: 10.13 },
];

const WEST = -13;
const EAST = 35;
const SOUTH = 34;
const NORTH = 58;
const VB_W = 700;
const VB_H = 500;

function project(lon: number, lat: number): [number, number] {
  const x = ((lon - WEST) / (EAST - WEST)) * VB_W;
  const y = ((NORTH - lat) / (NORTH - SOUTH)) * VB_H;
  return [x, y];
}

function ringToPath(ring: number[][]): string {
  return ring
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type CountryPath = { id: string; d: string };

function geoToCountryPaths(geojson: GeoJSON.FeatureCollection): CountryPath[] {
  const out: CountryPath[] = [];
  for (const feat of geojson.features) {
    const geom = feat.geometry;
    const parts: string[] = [];
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) parts.push(ringToPath(ring) + " Z");
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates)
        for (const ring of polygon) parts.push(ringToPath(ring) + " Z");
    }
    if (parts.length) out.push({ id: String(feat.id ?? out.length), d: parts.join(" ") });
  }
  return out;
}

// Palma de Mallorca — scaled ~2.5x for visibility (Natural Earth 110m omits small islands)
const MALLORCA_RING: [number, number][] = [
  [2.05, 39.12],
  [2.38, 39.25],
  [2.95, 39.55],
  [3.48, 39.88],
  [3.72, 40.0],
  [3.62, 39.75],
  [3.32, 39.48],
  [2.85, 39.18],
  [2.38, 39.12],
  [2.05, 39.12],
];

// IDs (ISO 3166-1 numeric) of European countries to render
const EU_IDS = new Set([
  "620","724","250","826","372","380","276","040","756","056","528","442","208",
  "616","203","703","348","642","100","804","112","440","428",
  "233","498","688","191","070","807","008","499","705","300","792","196",
]);

export default function EuropeRibMap() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryPath[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        const fc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
        const euFeatures: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: fc.features.filter((f) => EU_IDS.has(String(f.id))),
        };
        setCountries(geoToCountryPaths(euFeatures));
      })
      .catch(() => {});
  }, []);

  const handleClick = useCallback(
    (location: string) => router.push(`/rentals?location=${encodeURIComponent(location)}`),
    [router]
  );

  return (
    <>
      <style jsx global>{`
        @keyframes rib-ping {
          0%   { transform: scale(1);   opacity: 0.45; }
          75%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMaxYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label="Map of RIB charter locations in Europe"
      >
        <defs>
          <clipPath id="eu-clip"><rect x="0" y="0" width={VB_W} height={VB_H} /></clipPath>
          <filter id="tt-shadow" x="-30%" y="-40%" width="160%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.12" />
          </filter>
          <radialGradient id="hover-glow">
            <stop offset="0%" stopColor="#e74c3c" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#e74c3c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Country shapes — black fill with thin gray borders */}
        {countries.map((c) => (
          <path
            key={c.id}
            d={c.d}
            fill="#1a1a1a"
            stroke="#444"
            strokeWidth={1.2}
            clipPath="url(#eu-clip)"
          />
        ))}

        {/* Palma de Mallorca — Natural Earth 110m omits small islands */}
        <path
          d={ringToPath(MALLORCA_RING) + " Z"}
          fill="#1a1a1a"
          stroke="#444"
          strokeWidth={1.2}
          clipPath="url(#eu-clip)"
        />

        {!countries.length && (
          <text x={VB_W / 2} y={VB_H / 2} textAnchor="middle" fill="#ccc" fontSize="14"
            fontFamily="system-ui, sans-serif">Loading map…</text>
        )}

        {/* Location markers */}
        {RIB_LOCATIONS.map((loc) => {
          const [cx, cy] = project(loc.lon, loc.lat);
          const active = hovered === loc.id;
          return (
            <g
              key={loc.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(loc.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleClick(loc.location)}
            >
              {/* Pulse ring */}
              <circle cx={cx} cy={cy} r={12} fill="none" stroke="#e74c3c" strokeWidth={2}
                opacity={0.5}
                style={{ transformOrigin: `${cx}px ${cy}px`, animation: "rib-ping 2.8s ease-out infinite" }}
              />

              {/* Hover glow */}
              {active && <circle cx={cx} cy={cy} r={36} fill="url(#hover-glow)" />}

              {/* White pad */}
              <circle cx={cx} cy={cy} r={18} fill="white" opacity={0.6} />

              {/* Dot */}
              <circle cx={cx} cy={cy} r={active ? 13 : 11} fill="#e74c3c" stroke="white"
                strokeWidth={3} style={{ transition: "r 0.15s ease" }} />
              <circle cx={cx} cy={cy} r={3.5} fill="white" opacity={0.85} />

              {/* Tooltip */}
              {active && (() => {
                const w = Math.max(85, loc.label.length * 11 + 28);
                return (
                  <g style={{ pointerEvents: "none" }}>
                    <rect x={cx - w / 2} y={cy - 48} width={w} height={32} rx={9}
                      fill="white" filter="url(#tt-shadow)" />
                    <polygon points={`${cx - 6},${cy - 16} ${cx + 6},${cy - 16} ${cx},${cy - 8}`}
                      fill="white" />
                    <text x={cx} y={cy - 27} textAnchor="middle" fill="#1a1a2e" fontSize="15"
                      fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
                      {loc.label}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    </>
  );
}
