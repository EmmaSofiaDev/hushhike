"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PRESET_TRAILS } from "../../data/preset-trails";
import { calculateSolarAndPacing } from "../../lib/solar-calc";
import { executeMastraWorkflow } from "../../lib/mastra-agent";
import { PocketFieldCard } from "../../components/PocketFieldCard";
import {
  Compass,
  MapPin,
  Sliders,
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Clock,
  Droplets,
  Radio,
  Sparkles,
} from "lucide-react";

export default function CardStudioPage() {
  const [selectedTrailId, setSelectedTrailId] = useState<string>("skyline-ridge");
  const [departureTime, setDepartureTime] = useState<string>("14:15");
  const [paceMinKm, setPaceMinKm] = useState<number>(16);
  const [waterL, setWaterL] = useState<number>(2.5);
  const [emergencyNotes, setEmergencyNotes] = useState<string>(
    "SAR EMERGENCY FREQ: VHF 146.520 MHz // INT'L WHISTLE: 6 BLASTS/MIN"
  );
  const [isInkSaver, setIsInkSaver] = useState<boolean>(false);

  const trail = useMemo(() => {
    return PRESET_TRAILS.find((t) => t.id === selectedTrailId) || PRESET_TRAILS[0];
  }, [selectedTrailId]);

  const telemetry = useMemo(() => {
    return {
      trailName: trail.name,
      distanceKm: trail.distanceKm,
      elevationGainM: trail.elevationGainM,
      departureTime,
      hikingPaceMinKm: paceMinKm,
      waterCarriedL: waterL,
      ruggedness: trail.ruggedness,
      hasHeadlamp: true,
    };
  }, [trail, departureTime, paceMinKm, waterL]);

  const solar = useMemo(() => {
    return calculateSolarAndPacing(telemetry);
  }, [telemetry]);

  const dispatch = useMemo(() => {
    return executeMastraWorkflow(telemetry, solar, trail.waypoints);
  }, [telemetry, solar, trail.waypoints]);

  return (
    <div className="card-studio-root">
      {/* 1. Header Navigation */}
      <header className="hushhike-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <Link href="/" className="back-link" title="Return to Trailhead Cockpit">
              <ArrowLeft size={16} />
            </Link>
            <div className="brand-icon-box">
              <Compass size={18} />
            </div>
            <div className="flex items-center">
              <span className="brand-logo-text">HUSHIKE</span>
              <span className="brand-meta">3×5 TACTILE STUDIO</span>
            </div>
          </div>

          <nav className="nav-links-menu">
            <Link href="/" className="nav-menu-link">
              COCKPIT
            </Link>
            <Link href="/field" className="nav-menu-link">
              FIELD NAV
            </Link>
            <Link href="/card" className="nav-menu-link active">
              3×5 CARD
            </Link>
            <Link href="/physics" className="nav-menu-link">
              PHYSICS
            </Link>
          </nav>

          <div className="nav-pills">
            <button
              onClick={() => setIsInkSaver(!isInkSaver)}
              className={`tactile-btn ${isInkSaver ? "active-green" : ""}`}
              title="Toggle between High-Contrast Ink Saver (White) and Alpine Dark Slate"
            >
              <FileText size={13} />
              <span>{isInkSaver ? "INK SAVER (ON)" : "INK SAVER (OFF)"}</span>
            </button>
            <button onClick={() => window.print()} className="tactile-btn active-green">
              <Printer size={13} />
              <span>PRINT 3×5 CARD</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Route Selector Pills */}
      <section className="route-selector-bar">
        <div className="segmented-pills">
          {PRESET_TRAILS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTrailId(t.id);
                setDepartureTime(t.defaultStartTime);
                setWaterL(t.recommendedWaterL);
              }}
              className={`pill-item ${selectedTrailId === t.id ? "active" : ""}`}
            >
              <MapPin size={12} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="quick-telemetry-strip">
          <div className="strip-item">
            <span>DUSK:</span>
            <span className="val">{solar.mountainDuskTime}</span>
          </div>
          <div className="strip-item">
            <span>CUTOFF:</span>
            <span className="val" style={{ color: "var(--accent-crimson)" }}>
              {solar.turnaroundTime}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Main Workspace: Customizer Sidebar + Card Viewport */}
      <main className="cockpit-main" style={{ maxWidth: "1280px", margin: "1.5rem auto" }}>
        <div className="card-studio-grid">
          {/* Controls Column */}
          <div className="card-customizer-box">
            <div className="card-title-row">
              <div className="title-tag">
                <Sliders size={15} className="text-amber" />
                <span>Card Customization</span>
              </div>
              <span className="mono-spec">PRINT OPTIMIZER</span>
            </div>

            <div className="input-group">
              <div className="input-label">
                <span>Departure Time</span>
                <span className="val-tag">{departureTime}</span>
              </div>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="tactile-time-input"
              />
            </div>

            <div className="input-group">
              <div className="input-label">
                <span>Target Pace</span>
                <span className="val-tag">{paceMinKm} min/km</span>
              </div>
              <input
                type="range"
                min={11}
                max={25}
                value={paceMinKm}
                onChange={(e) => setPaceMinKm(parseInt(e.target.value))}
                className="custom-range"
              />
            </div>

            <div className="input-group">
              <div className="input-label">
                <span>Hydration Reserve</span>
                <span className="val-tag">{waterL.toFixed(1)} L</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={waterL}
                onChange={(e) => setWaterL(parseFloat(e.target.value))}
                className="custom-range"
              />
            </div>

            <div className="input-group">
              <div className="input-label">
                <span>Emergency SAR Liaison / Contact Note</span>
              </div>
              <input
                type="text"
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                className="custom-text-input"
                placeholder="e.g. VHF 146.520 Simplex // SAR Park Dispatch"
              />
            </div>

            <div className="field-instructions-box">
              <div className="inst-title">LAMINATION & FIELD USE GUIDE</div>
              <ul className="inst-list">
                <li>1. Print on heavy cardstock (65-110 lb) using 3×5 inch or A6 cut.</li>
                <li>2. Slide into clear waterproof matte vinyl badge pouch.</li>
                <li>3. Stow in outer zippered chest pocket; leave smartphone turned off inside pack.</li>
              </ul>
            </div>
          </div>

          {/* Interactive Card Preview */}
          <div className="card-preview-column">
            <PocketFieldCard
              dispatch={dispatch}
              solar={solar}
              telemetry={telemetry}
              emergencyNotes={emergencyNotes}
              isInkSaver={isInkSaver}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
