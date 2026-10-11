"use client";

import React, { useRef } from "react";
import { MastraDispatchResult, SolarCalculationResult, TrailTelemetry } from "../types/hushhike";
import { Download, Printer, Compass, Clock, Mountain, AlertTriangle, ShieldCheck, Radio } from "lucide-react";

interface PocketFieldCardProps {
  dispatch: MastraDispatchResult;
  solar: SolarCalculationResult;
  telemetry: TrailTelemetry;
  emergencyNotes?: string;
  isInkSaver?: boolean;
}

export const PocketFieldCard: React.FC<PocketFieldCardProps> = ({
  dispatch,
  solar,
  telemetry,
  emergencyNotes = "SAR EMERGENCY FREQ: VHF 146.520 MHz // INT'L WHISTLE: 6 BLASTS/MIN",
  isInkSaver = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSVG = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const bgFill = isInkSaver ? "#FFFFFF" : "#0D1410";
    const borderFill = isInkSaver ? "#000000" : "#E5A93C";
    const textTitle = isInkSaver ? "#000000" : "#FFFFFF";
    const textSub = isInkSaver ? "#333333" : "#A7B7AD";
    const textGold = isInkSaver ? "#884400" : "#E5A93C";
    const bannerFill = isInkSaver ? "#F0F0F0" : solar.isSunsetDeficit ? "#2A1414" : "#1B2A20";
    const bannerStroke = isInkSaver ? "#000000" : solar.isSunsetDeficit ? "#EF4444" : "#2DD4BF";
    const bannerText = isInkSaver ? "#000000" : solar.isSunsetDeficit ? "#EF4444" : "#2DD4BF";

    // Build standalone high-contrast SVG representation of the 3x5 card
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480" style="background:${bgFill}; font-family:'Courier New', monospace;">
  <rect width="708" height="468" x="6" y="6" rx="8" fill="${bgFill}" stroke="${borderFill}" stroke-width="2"/>
  <rect width="688" height="38" x="16" y="16" fill="${isInkSaver ? "#E5E5E5" : "#1B2820"}"/>
  <text x="30" y="41" font-size="16" font-weight="bold" fill="${textGold}">HUSSHIKE TACTILE FIELD CARD // ${dispatch.dispatchId}</text>
  <text x="560" y="41" font-size="13" font-weight="bold" fill="${textSub}">${telemetry.departureTime} DEPART</text>

  <!-- Route Overview -->
  <text x="30" y="82" font-size="20" font-weight="bold" fill="${textTitle}">${telemetry.trailName.toUpperCase()}</text>
  <text x="30" y="104" font-size="12" fill="${textSub}">${telemetry.distanceKm} KM  |  +${telemetry.elevationGainM}M ASCENT  |  PACE: ${telemetry.hikingPaceMinKm} MIN/KM  |  WATER: ${telemetry.waterCarriedL}L</text>

  <!-- Critical Dusk & Turnaround Box -->
  <rect width="660" height="54" x="30" y="118" rx="4" fill="${bannerFill}" stroke="${bannerStroke}" stroke-width="1.5"/>
  <text x="45" y="142" font-size="13" font-weight="bold" fill="${bannerText}">MOUNTAIN DUSK: ${solar.mountainDuskTime}</text>
  <text x="330" y="142" font-size="13" font-weight="bold" fill="${textGold}">HARD CUTOFF: ${solar.turnaroundTime}</text>
  <text x="45" y="160" font-size="11" fill="${textSub}">Rule: If summit is not reached by ${solar.turnaroundTime}, reverse descent immediately.</text>

  <!-- Waypoints Header -->
  <text x="30" y="196" font-size="12" font-weight="bold" fill="${textGold}">TACTILE WAYPOINT SEQUENCE (PHONE STOWED):</text>
  ${dispatch.offlineTactileCardData.waypoints
    .slice(0, 4)
    .map(
      (wp, idx) => `
  <g transform="translate(30, ${212 + idx * 46})">
    <circle cx="8" cy="8" r="7" fill="${textGold}" />
    <text x="5" y="12" font-size="10" font-weight="bold" fill="${isInkSaver ? "#FFFFFF" : "#000000"}">${idx + 1}</text>
    <text x="25" y="10" font-size="12" font-weight="bold" fill="${textTitle}">${wp.title} (${wp.distanceKm}km, +${wp.elevationM}m) [ETA ${wp.estimatedArrival}]</text>
    <text x="25" y="25" font-size="10" fill="${textSub}">${wp.landmark} -> ${wp.instruction}</text>
  </g>`
    )
    .join("")}

  <!-- Emergency Footer -->
  <line x1="30" y1="410" x2="690" y2="410" stroke="${isInkSaver ? "#CCCCCC" : "#25372C"}" stroke-width="1"/>
  <text x="30" y="430" font-size="10" font-weight="bold" fill="${textGold}">${emergencyNotes.toUpperCase()}</text>
  <text x="30" y="448" font-size="9" fill="${textSub}">HushHike Alpine Protocol // Screen off, eyes on terrain. Built for wilderness survival.</text>
</svg>
    `.trim();

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hushhike-field-card-${dispatch.dispatchId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`pocket-card-container ${isInkSaver ? "ink-saver-theme" : ""}`}>
      <div className="pocket-card-actions">
        <div className="pocket-card-title-badge">
          <Compass className="w-4 h-4 text-amber" />
          <span>Tactile 3×5 Field Card</span>
        </div>
        <div className="pocket-card-btn-group">
          <button onClick={handleDownloadSVG} className="tactile-btn outline" title="Download High-Res Vector SVG Card">
            <Download className="w-3.5 h-3.5" />
            <span>Download SVG</span>
          </button>
          <button onClick={handlePrint} className="tactile-btn outline" title="Print for Index Card / Backpack">
            <Printer className="w-3.5 h-3.5" />
            <span>Print 3×5 Card</span>
          </button>
        </div>
      </div>

      {/* The Printable 3x5 Physical Card */}
      <div ref={cardRef} className={`tactile-index-card ${isInkSaver ? "ink-saver" : ""}`}>
        <div className="card-topbar">
          <div className="card-serial">
            <span className="card-brand">HUSHIKE POCKET CARD</span>
            <span className="card-id">#{dispatch.dispatchId}</span>
          </div>
          <div className="card-depart">
            <Clock className="w-3.5 h-3.5 text-amber" />
            <span>DEPART: {telemetry.departureTime}</span>
          </div>
        </div>

        <div className="card-header-main">
          <h3 className="card-trail-name">{telemetry.trailName}</h3>
          <div className="card-specs">
            <span>{telemetry.distanceKm} km</span>
            <span className="dot">•</span>
            <span>+{telemetry.elevationGainM}m ascent</span>
            <span className="dot">•</span>
            <span>Pace: {telemetry.hikingPaceMinKm} min/km</span>
            <span className="dot">•</span>
            <span>Water: {telemetry.waterCarriedL}L</span>
          </div>
        </div>

        {/* Solar Safety Envelope Banner */}
        <div className={`card-solar-envelope ${solar.isSunsetDeficit ? "deficit" : "safe"}`}>
          <div className="solar-banner-row">
            <div className="solar-item">
              <span className="label">MOUNTAIN DUSK</span>
              <span className="val highlight">{solar.mountainDuskTime}</span>
            </div>
            <div className="solar-divider" />
            <div className="solar-item">
              <span className="label">HARD TURNAROUND</span>
              <span className="val alert">{solar.turnaroundTime}</span>
            </div>
            <div className="solar-divider" />
            <div className="solar-item">
              <span className="label">STATUS</span>
              <span className="val status">
                {solar.isSunsetDeficit ? (
                  <span className="flex-status red">
                    <AlertTriangle className="w-3 h-3" /> DEFICIT
                  </span>
                ) : (
                  <span className="flex-status green">
                    <ShieldCheck className="w-3 h-3" /> BUFFER +{solar.safetyMarginMinutes}m
                  </span>
                )}
              </span>
            </div>
          </div>
          <p className="solar-banner-instruction">
            Mandate: If summit is not cleared by {solar.turnaroundTime}, reverse descent immediately.
          </p>
        </div>

        {/* Waypoints Sequence */}
        <div className="card-waypoints-list">
          <div className="waypoints-subhead">
            <Mountain className="w-3.5 h-3.5 text-amber" />
            <span>TACTILE WAYPOINT SEQUENCE (PHONE IN PACK)</span>
          </div>
          {dispatch.offlineTactileCardData.waypoints.slice(0, 4).map((wp, idx) => (
            <div key={wp.id} className="card-waypoint-row">
              <div className="wp-badge">{idx + 1}</div>
              <div className="wp-details">
                <div className="wp-meta">
                  <span className="wp-title">{wp.title}</span>
                  <span className="wp-distance">{wp.distanceKm} km (+{wp.elevationM}m)</span>
                  <span className="wp-eta">ETA {wp.estimatedArrival}</span>
                </div>
                <div className="wp-instruction">
                  <span className="wp-landmark">{wp.landmark}</span> → <span className="wp-action">{wp.instruction}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Notes Banner */}
        {emergencyNotes && (
          <div className="card-emergency-strip">
            <Radio className="w-3 h-3 text-amber" />
            <span>{emergencyNotes}</span>
          </div>
        )}

        <div className="card-footer">
          <span>Stow phone in pack. Zero cellular bars required. Navigate by eye and sound.</span>
        </div>
      </div>
    </div>
  );
};
