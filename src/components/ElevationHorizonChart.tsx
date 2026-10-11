"use client";

import React, { useState } from "react";
import { SolarCalculationResult, TrailPreset } from "../types/hushhike";
import { Sun, Sunset, AlertOctagon, ShieldAlert } from "lucide-react";

interface ElevationHorizonChartProps {
  preset: TrailPreset;
  solar: SolarCalculationResult;
}

export const ElevationHorizonChart: React.FC<ElevationHorizonChartProps> = ({ preset, solar }) => {
  const [activeKm, setActiveKm] = useState<number>(preset.distanceKm * 0.5);

  const profile = preset.elevationProfile;
  const maxElev = Math.max(...profile.map((p) => p.elevationM), 1000);
  const minElev = Math.min(...profile.map((p) => p.elevationM), 300);
  const elevRange = maxElev - minElev || 1;

  const width = 640;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  // Coordinate scales
  const scaleX = (km: number) => paddingX + (km / preset.distanceKm) * (width - paddingX * 2);
  const scaleY = (m: number) => height - paddingY - ((m - minElev) / elevRange) * (height - paddingY * 2);

  // SVG path definitions
  const strokeD = profile.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.km).toFixed(1)} ${scaleY(p.elevationM).toFixed(1)}`).join(" ");
  const areaD = `${strokeD} L ${scaleX(preset.distanceKm).toFixed(1)} ${height - paddingY} L ${scaleX(0).toFixed(1)} ${height - paddingY} Z`;

  // Turnaround X position (~50% of the route)
  const turnaroundKm = preset.distanceKm * 0.52;
  const turnaroundX = scaleX(turnaroundKm);

  return (
    <div className="elevation-chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <Sun className="w-4 h-4 text-amber" />
          <span>Topographic Profile & Solar Shadow Envelope</span>
        </div>
        <div className="chart-metrics">
          <span className="metric-pill">
            <Sunset className="w-3.5 h-3.5 text-amber" /> Dusk: {solar.mountainDuskTime}
          </span>
          <span className={`metric-pill ${solar.isSunsetDeficit ? "alert" : "safe"}`}>
            {solar.isSunsetDeficit ? (
              <span className="flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Deficit: {Math.abs(solar.safetyMarginMinutes)}m past dusk
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-emerald" /> Buffer: +{solar.safetyMarginMinutes}m daylight
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="svg-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="elevation-svg">
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#162E23" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#07100B" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="duskShadowGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E5A93C" stopOpacity="0.05" />
              <stop offset="70%" stopColor="#EF4444" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#1A2D22" strokeDasharray="4 4" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#1A2D22" strokeDasharray="4 4" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#283F32" />

          {/* Elevation labels */}
          <text x={paddingX - 6} y={paddingY + 4} textAnchor="end" fontSize="10" fill="#6B8574">{maxElev}m</text>
          <text x={paddingX - 6} y={height - paddingY} textAnchor="end" fontSize="10" fill="#6B8574">{minElev}m</text>

          {/* Area fill */}
          <path d={areaD} fill="url(#elevGradient)" />

          {/* Stroke Line */}
          <path d={strokeD} fill="none" stroke="#2DD4BF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Hard Turnaround Cutoff line */}
          <line
            x1={turnaroundX}
            y1={paddingY}
            x2={turnaroundX}
            y2={height - paddingY}
            stroke="#E5A93C"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text x={turnaroundX + 6} y={paddingY + 14} fontSize="10" fontWeight="bold" fill="#E5A93C">
            CUT-OFF: {solar.turnaroundTime}
          </text>

          {/* Waypoint Markers */}
          {preset.waypoints.map((wp, idx) => {
            const x = scaleX(wp.distanceKm);
            // approximate elevation from profile
            const y = scaleY(wp.elevationM);
            return (
              <g key={wp.id} className="cursor-pointer">
                <circle cx={x} cy={y} r="6" fill="#0E1B14" stroke="#E5A93C" strokeWidth="2" />
                <circle cx={x} cy={y} r="2.5" fill="#FFFFFF" />
                <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#F3C068">
                  W{idx + 1}
                </text>
              </g>
            );
          })}

          {/* X axis Distance labels */}
          <text x={paddingX} y={height - 10} fontSize="10" fill="#6B8574">0 km (Trailhead)</text>
          <text x={width - paddingX} y={height - 10} textAnchor="end" fontSize="10" fill="#6B8574">
            {preset.distanceKm} km (Finish)
          </text>
        </svg>
      </div>

      {/* Scrubbing Simulation Bar */}
      <div className="chart-scrubber">
        <div className="scrubber-label">
          <span>Trailhead Progress Simulator:</span>
          <span className="scrubber-value">{activeKm.toFixed(1)} km / {preset.distanceKm} km</span>
        </div>
        <input
          type="range"
          min={0}
          max={preset.distanceKm}
          step={0.1}
          value={activeKm}
          onChange={(e) => setActiveKm(parseFloat(e.target.value))}
          className="scrubber-slider"
        />
        <div className="scrubber-legend">
          <span className="legend-item"><span className="legend-dot green" /> Trail Elevation Curve</span>
          <span className="legend-item"><span className="legend-dot amber" /> Turnaround Horizon ({solar.turnaroundTime})</span>
          <span className="legend-item"><span className="legend-dot teal" /> Waypoint Landmarks</span>
        </div>
      </div>
    </div>
  );
};
