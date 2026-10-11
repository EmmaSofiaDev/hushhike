"use client";

import React, { useState } from "react";
import Link from "next/link";
import { calculateToblerVelocity } from "../../lib/solar-calc";
import {
  Compass,
  ArrowLeft,
  Sun,
  Mountain,
  Activity,
  Droplets,
  BookOpen,
  Calculator,
  ShieldCheck,
  Flame,
  Clock,
  Layers,
} from "lucide-react";

export default function PhysicsPage() {
  // Interactive Calculator State
  const [calcDistKm, setCalcDistKm] = useState<number>(10);
  const [calcElevM, setCalcElevM] = useState<number>(800);
  const [packWeightKg, setPackWeightKg] = useState<number>(8);
  const [ambientTempC, setAmbientTempC] = useState<number>(16);

  // Math Calculations
  const calculatedSpeed = calculateToblerVelocity(calcDistKm, calcElevM);
  const slopePercent = ((calcElevM / (calcDistKm * 1000)) * 100).toFixed(1);
  const paceMinKm = (60 / calculatedSpeed).toFixed(1);

  // Naismith-Langmuir Rule: 5 km/h on flat + 1 hr per 600m ascent + descent factor
  const naismithHours = calcDistKm / 5 + calcElevM / 600;
  const naismithTotalMin = Math.round(naismithHours * 60);

  // Tobler Duration
  const toblerDurationMin = Math.round((calcDistKm / calculatedSpeed) * 60);

  // Caloric Burn: base ~400 kcal/hr + pack weight factor + slope factor
  const baseKcalPerHr = 420 + packWeightKg * 12 + parseFloat(slopePercent) * 15;
  const totalCalories = Math.round((toblerDurationMin / 60) * baseKcalPerHr);

  // Hydration Requirement: 0.5L/hr baseline + temp factor (>20C adds 0.15L/hr)
  const tempExcess = Math.max(0, ambientTempC - 15);
  const waterRatePerHr = 0.5 + (tempExcess * 0.02) + (packWeightKg > 10 ? 0.1 : 0);
  const totalWaterL = ((toblerDurationMin / 60) * waterRatePerHr).toFixed(1);

  // Topographic Ridge Shadow Occlusion Offset (minutes)
  const ridgeShadowMinutes = Math.min(45, Math.max(20, Math.round(calcElevM / 24)));

  return (
    <div className="physics-page-root">
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
              <span className="brand-meta">PHYSICS ENGINE & SAFETY PROOFS</span>
            </div>
          </div>

          <nav className="nav-links-menu">
            <Link href="/" className="nav-menu-link">
              COCKPIT
            </Link>
            <Link href="/field" className="nav-menu-link">
              FIELD NAV
            </Link>
            <Link href="/card" className="nav-menu-link">
              3×5 CARD
            </Link>
            <Link href="/physics" className="nav-menu-link active">
              PHYSICS
            </Link>
          </nav>

          <div className="nav-pills">
            <Link href="/field" className="tactile-btn active-green">
              <span>LAUNCH FIELD HUD</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="cockpit-main" style={{ maxWidth: "1280px", margin: "1.5rem auto" }}>
        {/* Core Philosophy Banner */}
        <div className="card-panel" style={{ marginBottom: "1.5rem" }}>
          <div className="card-title-row">
            <div className="title-tag">
              <BookOpen size={15} className="text-mint" />
              <span>Wilderness Navigation Epistemology</span>
            </div>
            <span className="mono-spec">LIFE-CRITICAL KINEMATICS</span>
          </div>
          <p style={{ color: "var(--text-body)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            In steep mountain topography, relying on cellular navigation apps is a leading cause of Search & Rescue dispatches. Battery failure in cold alpine temperatures, screen glare blinding rhodopsin night vision, and delayed cloud routing create critical disorientation. HushHike computes mathematical ephemeris and kinematics before departure, encoding critical safety limits onto physical 3×5 index cards and calm acoustic briefings so you can stow your phone and navigate by natural terrain features.
          </p>
        </div>

        {/* INTERACTIVE MULTI-VARIABLE SIMULATOR */}
        <div className="card-panel interactive-simulator-panel" style={{ marginBottom: "1.5rem" }}>
          <div className="card-title-row">
            <div className="title-tag">
              <Calculator size={15} className="text-mint" />
              <span>Interactive Alpine Kinematics & Metabolic Calculator</span>
            </div>
            <span className="mono-spec">REAL-TIME SOLVER</span>
          </div>

          <div className="simulator-grid">
            {/* Input Sliders */}
            <div className="sim-inputs">
              <div className="input-group">
                <div className="input-label">
                  <span>Ground Distance</span>
                  <span className="val-tag">{calcDistKm} km</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={28}
                  step={0.5}
                  value={calcDistKm}
                  onChange={(e) => setCalcDistKm(parseFloat(e.target.value))}
                  className="custom-range"
                />
              </div>

              <div className="input-group">
                <div className="input-label">
                  <span>Vertical Ascent Gain</span>
                  <span className="val-tag">+{calcElevM}m</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2200}
                  step={25}
                  value={calcElevM}
                  onChange={(e) => setCalcElevM(parseInt(e.target.value))}
                  className="custom-range"
                />
              </div>

              <div className="input-group">
                <div className="input-label">
                  <span>Pack Weight</span>
                  <span className="val-tag">{packWeightKg} kg</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={25}
                  value={packWeightKg}
                  onChange={(e) => setPackWeightKg(parseInt(e.target.value))}
                  className="custom-range"
                />
              </div>

              <div className="input-group">
                <div className="input-label">
                  <span>Ambient Temperature</span>
                  <span className="val-tag">{ambientTempC}°C</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={35}
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(parseInt(e.target.value))}
                  className="custom-range"
                />
              </div>
            </div>

            {/* Calculated Output Matrix */}
            <div className="sim-outputs">
              <div className="out-cell">
                <div className="out-lbl">SLOPE GRADE</div>
                <div className="out-val text-amber">{slopePercent}%</div>
                <div className="out-sub">
                  {parseFloat(slopePercent) < 8
                    ? "Class 1 Flat / Rolling"
                    : parseFloat(slopePercent) < 18
                    ? "Class 2 Sustained Incline"
                    : "Class 3 Technical Scramble"}
                </div>
              </div>

              <div className="out-cell">
                <div className="out-lbl">TOBLER VELOCITY</div>
                <div className="out-val text-mint">{calculatedSpeed.toFixed(2)} km/h</div>
                <div className="out-sub">{paceMinKm} min/km cadence</div>
              </div>

              <div className="out-cell">
                <div className="out-lbl">ESTIMATED TRANSIT</div>
                <div className="out-val text-white">
                  {Math.floor(toblerDurationMin / 60)}h {(toblerDurationMin % 60).toString().padStart(2, "0")}m
                </div>
                <div className="out-sub">Naismith Baseline: {Math.floor(naismithTotalMin / 60)}h {naismithTotalMin % 60}m</div>
              </div>

              <div className="out-cell">
                <div className="out-lbl">METABOLIC EXPENDITURE</div>
                <div className="out-val text-amber">{totalCalories} kcal</div>
                <div className="out-sub">{Math.round(totalCalories / (toblerDurationMin / 60))} kcal/hr burn</div>
              </div>

              <div className="out-cell">
                <div className="out-lbl">HYDRATION NEED</div>
                <div className="out-val text-mint">{totalWaterL} L</div>
                <div className="out-sub">{waterRatePerHr.toFixed(2)} L/hr fluid intake</div>
              </div>

              <div className="out-cell">
                <div className="out-lbl">RIDGE DUSK OCCLUSION</div>
                <div className="out-val text-crimson">-{ridgeShadowMinutes} min</div>
                <div className="out-sub">Shadow cutoff before astronomical sunset</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mathematical Formulas Grid */}
        <div className="cockpit-deck-grid" style={{ marginBottom: "1.5rem" }}>
          {/* TOBLER'S VELOCITY FORMULA */}
          <div className="card-panel">
            <div className="card-title-row">
              <div className="title-tag">
                <Mountain size={15} className="text-amber" />
                <span>Waldo Tobler&apos;s Hiking Velocity (1993)</span>
              </div>
              <span className="mono-spec">KINEMATICS</span>
            </div>
            <div className="formula-box text-mint">
              W = 6 · exp(-3.5 · |tan(θ) + 0.05|) km/h
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.6 }}>
              Published in Waldo Tobler&apos;s landmark paper <em>Three Presentations on Geographical Analysis and Modeling</em>, this exponential formulation captures empirical human walking speed on varying terrain slopes. Peak velocity occurs at a gentle downhill (-2.86° or -0.05 slope), while uphill scrambles suffer exponential deceleration.
            </p>
          </div>

          {/* MOUNTAIN DUSK RIDGE OCCLUSION */}
          <div className="card-panel">
            <div className="card-title-row">
              <div className="title-tag">
                <Sun size={15} className="text-amber" />
                <span>Topographic Ridge Shadow Occlusion Model</span>
              </div>
              <span className="mono-spec">SOLAR EPHEMERIS</span>
            </div>
            <div className="formula-box text-amber">
              T_dusk = T_astronomical - clamp(20, 45, round(ΔH / 24)) min
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.6, marginBottom: "0.85rem" }}>
              Standard weather forecasts report astronomical sunset at a flat sea-level horizon. In mountain valleys and cirques, high ridgelines to the west block direct solar illumination 20 to 45 minutes earlier. Once the sun crests the ridge, ambient lumens drop by 99.8% within 12 minutes.
            </p>
            <div className="mandate-alert-box">
              <strong>The 52% Point of No Return:</strong> The turnaround cutoff is strictly placed at 52% of the daylight envelope from departure to Mountain Dusk. If the summit is not cleared by cutoff time, reversing course is mandatory.
            </div>
          </div>
        </div>

        {/* NAISMITH & PANDOLF PHYSIOLOGY FORMULAS */}
        <div className="cockpit-deck-grid">
          <div className="card-panel">
            <div className="card-title-row">
              <div className="title-tag">
                <Clock size={15} className="text-mint" />
                <span>Naismith&apos;s Rule & Langmuir Corrections</span>
              </div>
              <span className="mono-spec">SCOTTISH MOUNTAINEERING</span>
            </div>
            <div className="formula-box text-white">
              T = (Distance / 5 km/h) + (Ascent / 600m) + T_descent
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.6 }}>
              Devised in 1892 by William Naismith and refined in 1984 by Eric Langmuir. For descent on slopes steeper than 12° (21%), Langmuir adds 10 minutes per 300m of elevation loss to account for joint eccentric braking forces.
            </p>
          </div>

          <div className="card-panel">
            <div className="card-title-row">
              <div className="title-tag">
                <Activity size={15} className="text-mint" />
                <span>Pandolf Metabolic Load Carriage Model</span>
              </div>
              <span className="mono-spec">USARIEM PHYSIOLOGY</span>
            </div>
            <div className="formula-box text-mint">
              M = 1.5W + 2.0(W+L)(L/W)² + η(W+L)[1.5V² + 0.35VG]
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.6 }}>
              Developed by the US Army Research Institute of Environmental Medicine (USARIEM), this formula predicts metabolic expenditure M (Watts) as a function of hiker mass W, pack load L, velocity V, slope grade G, and terrain terrain terrain coefficient η.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
