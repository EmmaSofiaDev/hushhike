"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PRESET_TRAILS } from "../data/preset-trails";
import { TrailTelemetry, RuggednessTier } from "../types/hushhike";
import { calculateSolarAndPacing } from "../lib/solar-calc";
import { executeMastraWorkflow } from "../lib/mastra-agent";
import { audioDispatcher, PlaybackState } from "../lib/audio-dispatcher";
import Link from "next/link";
import { Alpine3DScene } from "../components/Alpine3DScene";
import { ElevationHorizonChart } from "../components/ElevationHorizonChart";
import { PocketFieldCard } from "../components/PocketFieldCard";
import {
  Compass,
  Mountain,
  Sun,
  Sunset,
  Volume2,
  Play,
  Square,
  Radio,
  Clock,
  Droplets,
  Flame,
  AlertTriangle,
  ShieldCheck,
  Sliders,
  MapPin,
  ChevronDown,
  Download,
} from "lucide-react";

export default function HushHikeHome() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("skyline-ridge");
  const selectedPreset = useMemo(() => {
    return PRESET_TRAILS.find((t) => t.id === selectedPresetId) || PRESET_TRAILS[0];
  }, [selectedPresetId]);

  // Form State
  const [distanceKm, setDistanceKm] = useState<number>(selectedPreset.distanceKm);
  const [elevationGainM, setElevationGainM] = useState<number>(selectedPreset.elevationGainM);
  const [departureTime, setDepartureTime] = useState<string>(selectedPreset.defaultStartTime);
  const [hikingPaceMinKm, setHikingPaceMinKm] = useState<number>(16);
  const [waterCarriedL, setWaterCarriedL] = useState<number>(2.0);
  const [ruggedness, setRuggedness] = useState<RuggednessTier>(selectedPreset.ruggedness);
  const [hasHeadlamp, setHasHeadlamp] = useState<boolean>(true);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  // Audio Playback state
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    progress: 0,
    currentTime: "0:00",
    totalTime: "0:00",
  });

  // Sync state when preset changes
  useEffect(() => {
    setDistanceKm(selectedPreset.distanceKm);
    setElevationGainM(selectedPreset.elevationGainM);
    setDepartureTime(selectedPreset.defaultStartTime);
    setRuggedness(selectedPreset.ruggedness);
    setWaterCarriedL(selectedPreset.recommendedWaterL);
  }, [selectedPreset]);

  // Compute Telemetry, Solar, and Mastra Agent Workflow
  const telemetry: TrailTelemetry = useMemo(() => {
    return {
      trailName: selectedPreset.name,
      distanceKm,
      elevationGainM,
      departureTime,
      hikingPaceMinKm,
      waterCarriedL,
      ruggedness,
      hasHeadlamp,
    };
  }, [
    selectedPreset.name,
    distanceKm,
    elevationGainM,
    departureTime,
    hikingPaceMinKm,
    waterCarriedL,
    ruggedness,
    hasHeadlamp,
  ]);

  const solar = useMemo(() => {
    return calculateSolarAndPacing(telemetry);
  }, [telemetry]);

  const dispatch = useMemo(() => {
    return executeMastraWorkflow(telemetry, solar, selectedPreset.waypoints);
  }, [telemetry, solar, selectedPreset.waypoints]);

  const handlePlayAudio = () => {
    if (playback.isPlaying) {
      audioDispatcher.stop();
      setPlayback((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audioDispatcher.playRangerScript(
        dispatch.rangerVoiceScript,
        null,
        (state) => setPlayback(state),
        () => setPlayback((prev) => ({ ...prev, isPlaying: false, progress: 0 }))
      );
    }
  };

  const handleDownloadAudio = () => {
    const blob = audioDispatcher.generateOfflineAudioBlob(telemetry.trailName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hushhike-${selectedPreset.id}-briefing.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const timePresets = ["08:00", "11:30", "14:15", "16:30"];

  return (
    <div className="hushhike-root">
      {/* 1. Swiss Minimal Navigation */}
      <header className="hushhike-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-icon-box">
              <Compass size={20} />
            </div>
            <div className="flex items-center">
              <span className="brand-logo-text">HUSHIKE</span>
              <span className="brand-meta">TOUCH GRASS · 2026</span>
            </div>
          </div>

          <nav className="nav-links-menu">
            <Link href="/" className="nav-menu-link active">
              COCKPIT
            </Link>
            <Link href="/field" className="nav-menu-link">
              FIELD NAV
            </Link>
            <Link href="/card" className="nav-menu-link">
              3×5 CARD
            </Link>
            <Link href="/physics" className="nav-menu-link">
              PHYSICS
            </Link>
          </nav>

          <div className="nav-pills">
            <div className="status-badge">
              <span className="pulse-dot" />
              <span>OFFLINE ARMED</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Route Selector Pills Bar */}
      <section className="route-selector-bar">
        <div className="segmented-pills">
          {PRESET_TRAILS.map((trail) => (
            <button
              key={trail.id}
              onClick={() => setSelectedPresetId(trail.id)}
              className={`pill-item ${selectedPresetId === trail.id ? "active" : ""}`}
            >
              <MapPin size={13} />
              <span>{trail.name}</span>
            </button>
          ))}
        </div>

        <div className="quick-telemetry-strip">
          <div className="strip-item">
            <span>LOC:</span>
            <span className="val">{selectedPreset.location}</span>
          </div>
          <div className="strip-item">
            <span>ELEV:</span>
            <span className="val">+{elevationGainM}m</span>
          </div>
          <div className="strip-item">
            <span>DIST:</span>
            <span className="val">{distanceKm.toFixed(1)} km</span>
          </div>
        </div>
      </section>

      {/* 3. Main Cockpit Layout */}
      <main className="cockpit-main">
        {/* STAGE 1: CINEMATIC 3D ALPINESCAPE HERO & SOLAR RIBBON */}
        <Alpine3DScene
          elevationGainM={elevationGainM}
          departureTime={departureTime}
          isDeficit={solar.isSunsetDeficit}
          mountainDuskTime={solar.mountainDuskTime}
        />

        {/* High-Impact Solar Telemetry Strip */}
        <div className="solar-stats-strip">
          <div className="stat-cell">
            <span className="cell-lbl">DEPART</span>
            <span className="cell-val">{telemetry.departureTime}</span>
          </div>
          <div className="stat-cell">
            <span className="cell-lbl">EST. FINISH</span>
            <span className="cell-val mint">{solar.estimatedFinishTime}</span>
          </div>
          <div className="stat-cell">
            <span className="cell-lbl">MOUNTAIN DUSK</span>
            <span className="cell-val amber">{solar.mountainDuskTime}</span>
          </div>
          <div className="stat-cell">
            <span className="cell-lbl">TURNAROUND</span>
            <span className="cell-val crimson">{solar.turnaroundTime}</span>
          </div>
          <div className="stat-cell text-right">
            <span className="cell-lbl">SAFETY BUFFER</span>
            <span className={`cell-val ${solar.isSunsetDeficit ? "crimson" : "mint"}`}>
              {solar.isSunsetDeficit
                ? `-${Math.abs(solar.safetyMarginMinutes)}m DEFICIT`
                : `+${solar.safetyMarginMinutes}m DAYLIGHT`}
            </span>
          </div>
        </div>

        {/* STAGE 2: TWO-COLUMN TACTILE INSTRUMENT DECK */}
        <div className="cockpit-deck-grid">
          {/* COLUMN A: TACTILE TELEMETRY CONTROLS */}
          <div className="deck-column">
            <div className="card-panel">
              <div className="card-title-row">
                <div className="title-tag">
                  <Sliders size={15} className="text-amber" />
                  <span>Trailhead Telemetry</span>
                </div>
                <span className="mono-spec">INSTRUMENT DECK</span>
              </div>

              {/* Quick Departure Time Picker */}
              <div className="input-group">
                <div className="input-label">
                  <span>Departure Time</span>
                  <span className="val-tag">{departureTime}</span>
                </div>
                <div className="quick-time-presets">
                  {timePresets.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDepartureTime(t)}
                      className={`time-preset-pill ${departureTime === t ? "active" : ""}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="tactile-time-input"
                />
              </div>

              {/* Distance Slider */}
              <div className="input-group">
                <div className="input-label">
                  <span>Distance</span>
                  <span className="val-tag">{distanceKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={25}
                  step={0.1}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                  className="custom-range"
                />
              </div>

              {/* Ascent Gain */}
              <div className="input-group">
                <div className="input-label">
                  <span>Ascent</span>
                  <span className="val-tag">+{elevationGainM}m</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1800}
                  step={25}
                  value={elevationGainM}
                  onChange={(e) => setElevationGainM(parseInt(e.target.value))}
                  className="custom-range"
                />
              </div>

              {/* Cadence */}
              <div className="input-group">
                <div className="input-label">
                  <span>Cadence</span>
                  <span className="val-tag">{hikingPaceMinKm} min/km</span>
                </div>
                <input
                  type="range"
                  min={11}
                  max={24}
                  step={1}
                  value={hikingPaceMinKm}
                  onChange={(e) => setHikingPaceMinKm(parseInt(e.target.value))}
                  className="custom-range"
                />
              </div>

              {/* Hydration */}
              <div className="input-group">
                <div className="input-label">
                  <span>Hydration</span>
                  <span className="val-tag">{waterCarriedL.toFixed(1)} L</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  value={waterCarriedL}
                  onChange={(e) => setWaterCarriedL(parseFloat(e.target.value))}
                  className="custom-range"
                />
              </div>

              {/* Terrain Ruggedness Segmented Toggle */}
              <div className="input-group">
                <div className="input-label">
                  <span>Terrain Class</span>
                </div>
                <div className="segmented-class-picker">
                  <button
                    type="button"
                    onClick={() => setRuggedness("CLASS_1_EASY")}
                    className={`class-pill-btn ${ruggedness === "CLASS_1_EASY" ? "active" : ""}`}
                  >
                    CLASS 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuggedness("CLASS_2_MODERATE")}
                    className={`class-pill-btn ${ruggedness === "CLASS_2_MODERATE" ? "active" : ""}`}
                  >
                    CLASS 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuggedness("CLASS_3_SCRAMBLE")}
                    className={`class-pill-btn ${ruggedness === "CLASS_3_SCRAMBLE" ? "active" : ""}`}
                  >
                    CLASS 3
                  </button>
                </div>
              </div>

              {/* Headlamp Toggle */}
              <label className="headlamp-toggle">
                <input
                  type="checkbox"
                  checked={hasHeadlamp}
                  onChange={(e) => setHasHeadlamp(e.target.checked)}
                />
                <span>Headlamp confirmed stowed in pack</span>
              </label>
            </div>
          </div>

          {/* COLUMN B: ACOUSTIC DISPATCH & 3X5 FIELD CARD */}
          <div className="deck-column">
            {/* Ranger Voice Dispatch Player */}
            <div className="ranger-audio-card">
              <div className="card-title-row">
                <div className="title-tag">
                  <Radio size={15} className="text-amber" />
                  <span>Acoustic Ranger Dispatch</span>
                </div>
                <span className="mono-spec">ELEVENLABS AUDIO</span>
              </div>

              {/* Dynamic Waveform Strip */}
              <div className="waveform-strip">
                {[8, 16, 28, 14, 32, 22, 36, 12, 38, 26, 18, 40, 20, 28, 14, 34, 22, 10, 26, 16, 32, 14].map(
                  (h, i) => (
                    <div
                      key={i}
                      className={`wave-bar ${playback.isPlaying ? "active" : ""}`}
                      style={{
                        height: playback.isPlaying ? `${h}px` : "7px",
                        animationDelay: `${i * 0.04}s`,
                      }}
                    />
                  )
                )}
              </div>

              {/* Play / Stop & Download Audio Controls */}
              <div className="audio-controls-row">
                <button
                  onClick={handlePlayAudio}
                  className={`btn-play-tactical ${playback.isPlaying ? "playing" : ""}`}
                >
                  {playback.isPlaying ? <Square size={14} /> : <Play size={14} />}
                  <span>{playback.isPlaying ? "Stop Dispatch" : "Play Ranger Dispatch"}</span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    onClick={handleDownloadAudio}
                    className="tactile-btn outline"
                    title="Download offline tactical WAV audio file"
                  >
                    <Download size={12} />
                    <span>SAVE WAV</span>
                  </button>
                  <span className="audio-timer">
                    {playback.isPlaying ? `${playback.currentTime} / ${playback.totalTime}` : "42s Audio"}
                  </span>
                </div>
              </div>

              {/* Minimal Expandable Transcript */}
              <div
                onClick={() => setShowTranscript(!showTranscript)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.68rem",
                  padding: "4px 0",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>{showTranscript ? "COLLAPSE TRANSCRIPT" : "VIEW VERBATIM TRANSCRIPT"}</span>
                <ChevronDown
                  size={12}
                  style={{
                    transform: showTranscript ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>

              {showTranscript && (
                <div className="ranger-quote-box">
                  &ldquo;{dispatch.rangerVoiceScript}&rdquo;
                </div>
              )}

              {/* Metabolic Mini Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.65rem",
                  marginTop: "0.85rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                }}
              >
                <div
                  style={{
                    background: "var(--bg-surface-elevated)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Droplets size={14} style={{ color: "var(--accent-mint)" }} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>WATER TARGET</div>
                    <div style={{ fontWeight: "bold", color: "#fff" }}>{dispatch.recommendedWaterL} L</div>
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-surface-elevated)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Flame size={14} style={{ color: "var(--accent-amber)" }} />
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.58rem" }}>CALORIC BURN</div>
                    <div style={{ fontWeight: "bold", color: "#fff" }}>{dispatch.estimatedCaloriesBurned} kcal</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactile 3x5 Pocket Field Card */}
            <PocketFieldCard dispatch={dispatch} solar={solar} telemetry={telemetry} />
          </div>
        </div>

        {/* STAGE 3: FULL-WIDTH TOPOGRAPHIC ELEVATION PROFILE */}
        <div className="elevation-chart-card">
          <ElevationHorizonChart preset={selectedPreset} solar={solar} />
        </div>

        {/* STAGE 4: WAYPOINT LANDMARKS SEQUENCE */}
        <div className="landmarks-deck">
          <div className="card-title-row">
            <div className="title-tag">
              <Mountain size={15} className="text-mint" />
              <span>Tactile Waypoint Sequence</span>
            </div>
            <span className="mono-spec">PHONE STOWED IN PACK</span>
          </div>

          <div className="landmarks-grid">
            {dispatch.offlineTactileCardData.waypoints.map((wp, idx) => (
              <div key={wp.id} className="landmark-card">
                <div className="l-card-header">
                  <div className="l-num-badge">{idx + 1}</div>
                  <div className="l-card-eta">ETA {wp.estimatedArrival}</div>
                </div>
                <div className="l-card-title">{wp.title}</div>
                <div className="l-card-cue">{wp.landmark} ↳ {wp.instruction}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
