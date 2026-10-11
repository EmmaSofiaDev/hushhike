"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { PRESET_TRAILS } from "../../data/preset-trails";
import {
  calculateSolarAndPacing,
  calculateBearingAndDistance,
  getCardinalDirection,
  calculateRelativeBearing,
} from "../../lib/solar-calc";
import { audioDispatcher } from "../../lib/audio-dispatcher";
import { Waypoint } from "../../types/hushhike";
import {
  Compass,
  MapPin,
  Sun,
  Sunset,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Volume2,
  CheckCircle2,
  Eye,
  Navigation,
  ArrowLeft,
  Flame,
  Radio,
  Plus,
  X,
  Target,
  LocateFixed,
  Zap,
} from "lucide-react";

export default function FieldModePage() {
  const [selectedTrailId, setSelectedTrailId] = useState<string>("skyline-ridge");
  const [headingDeg, setHeadingDeg] = useState<number>(312);
  const [isNightRedMode, setIsNightRedMode] = useState<boolean>(false);
  const [isSosActive, setIsSosActive] = useState<boolean>(false);
  const [sosMode, setSosMode] = useState<"ALPINE_6" | "MORSE_SOS">("ALPINE_6");
  const [isStrobeActive, setIsStrobeActive] = useState<boolean>(false);
  const [isTrackingGps, setIsTrackingGps] = useState<boolean>(false);
  const [reachedWaypoints, setReachedWaypoints] = useState<Record<string, boolean>>({});
  const [customWaypoints, setCustomWaypoints] = useState<Waypoint[]>([]);
  const [isAddWpModalOpen, setIsAddWpModalOpen] = useState<boolean>(false);
  
  // Custom waypoint form state
  const [newWpTitle, setNewWpTitle] = useState("");
  const [newWpElev, setNewWpElev] = useState(1800);
  const [newWpLandmark, setNewWpLandmark] = useState("");
  const [newWpInstruction, setNewWpInstruction] = useState("");
  const [newWpLat, setNewWpLat] = useState("");
  const [newWpLon, setNewWpLon] = useState("");

  const watchIdRef = useRef<number | null>(null);

  const presetTrail = useMemo(() => {
    return PRESET_TRAILS.find((t) => t.id === selectedTrailId) || PRESET_TRAILS[0];
  }, [selectedTrailId]);

  // Combined waypoints (preset + custom)
  const allWaypoints = useMemo(() => {
    return [...presetTrail.waypoints, ...customWaypoints];
  }, [presetTrail.waypoints, customWaypoints]);

  // Live GPS Geolocation State
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lon: number;
    alt: number;
    accuracy: number;
    speed: number | null;
    status: string;
    isLive: boolean;
  }>({
    lat: presetTrail.trailheadLat || 46.7865,
    lon: presetTrail.trailheadLon || -121.735,
    alt: presetTrail.elevationProfile[0]?.elevationM || 1640,
    accuracy: 4,
    speed: null,
    status: "TRAILHEAD BASELINE",
    isLive: false,
  });

  // Load custom waypoints and reached state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedReached = localStorage.getItem(`hushhike_reached_${selectedTrailId}`);
        if (savedReached) {
          setReachedWaypoints(JSON.parse(savedReached));
        } else {
          setReachedWaypoints({});
        }

        const savedCustom = localStorage.getItem(`hushhike_custom_wp_${selectedTrailId}`);
        if (savedCustom) {
          setCustomWaypoints(JSON.parse(savedCustom));
        } else {
          setCustomWaypoints([]);
        }
      } catch {
        // localStorage not accessible
      }
    }
  }, [selectedTrailId]);

  // Save reached state to localStorage
  const toggleWaypointReached = (id: string) => {
    setReachedWaypoints((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(`hushhike_reached_${selectedTrailId}`, JSON.stringify(updated));
      } catch {
        // storage quota
      }
      return updated;
    });
  };

  // Find next pending waypoint
  const nextPendingWaypoint = useMemo(() => {
    return allWaypoints.find((wp) => !reachedWaypoints[wp.id]) || allWaypoints[allWaypoints.length - 1];
  }, [allWaypoints, reachedWaypoints]);

  // Calculate live navigation telemetry to target waypoint
  const targetNav = useMemo(() => {
    if (!nextPendingWaypoint || nextPendingWaypoint.lat === undefined || nextPendingWaypoint.lon === undefined) {
      return {
        bearingDeg: 0,
        distanceKm: 0,
        distanceM: 0,
        cardinal: "NORTH",
        relativeSteer: { offsetDeg: 0, instruction: "ON COURSE" },
      };
    }

    const { bearingDeg, distanceM, distanceKm } = calculateBearingAndDistance(
      gpsCoords.lat,
      gpsCoords.lon,
      nextPendingWaypoint.lat,
      nextPendingWaypoint.lon
    );

    const cardinal = getCardinalDirection(bearingDeg);
    const relativeSteer = calculateRelativeBearing(headingDeg, bearingDeg);

    return {
      bearingDeg,
      distanceKm,
      distanceM,
      cardinal,
      relativeSteer,
    };
  }, [gpsCoords.lat, gpsCoords.lon, nextPendingWaypoint, headingDeg]);

  const solar = useMemo(() => {
    return calculateSolarAndPacing({
      trailName: presetTrail.name,
      distanceKm: presetTrail.distanceKm,
      elevationGainM: presetTrail.elevationGainM,
      departureTime: presetTrail.defaultStartTime,
      hikingPaceMinKm: 16,
      waterCarriedL: presetTrail.recommendedWaterL,
      ruggedness: presetTrail.ruggedness,
      hasHeadlamp: true,
    });
  }, [presetTrail]);

  // Device Orientation Compass
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // iOS Safari uses webkitCompassHeading (0 = North)
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number" && !isNaN(webkitHeading)) {
        setHeadingDeg(Math.round(webkitHeading));
      } else if (e.alpha !== null) {
        setHeadingDeg(Math.round(360 - e.alpha));
      }
    };

    if (typeof window !== "undefined" && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
    };
  }, []);

  // Request Continuous Live GPS Tracking
  const toggleLiveGpsTracking = () => {
    if (isTrackingGps) {
      // Stop tracking
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTrackingGps(false);
      setGpsCoords((prev) => ({ ...prev, status: "TRACKING PAUSED", isLive: false }));
      return;
    }

    if (!navigator.geolocation) {
      setGpsCoords((prev) => ({ ...prev, status: "GPS HARDWARE NOT DETECTED" }));
      return;
    }

    setGpsCoords((prev) => ({ ...prev, status: "ACQUIRING SATELLITES..." }));

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsCoords({
          lat: parseFloat(pos.coords.latitude.toFixed(5)),
          lon: parseFloat(pos.coords.longitude.toFixed(5)),
          alt: pos.coords.altitude ? Math.round(pos.coords.altitude) : presetTrail.elevationProfile[0]?.elevationM || 1140,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 4,
          speed: pos.coords.speed ? parseFloat((pos.coords.speed * 3.6).toFixed(1)) : null,
          status: "LIVE SATELLITE FIX (3D LOCK)",
          isLive: true,
        });
        setIsTrackingGps(true);
      },
      (err) => {
        setGpsCoords((prev) => ({
          ...prev,
          status: `GPS ERR: ${err.message}`,
          isLive: false,
        }));
        setIsTrackingGps(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    watchIdRef.current = id;
  };

  // Reset GPS to Trailhead Baseline coordinates
  const setBaselineTrailheadCoords = () => {
    setGpsCoords({
      lat: presetTrail.trailheadLat || 46.7865,
      lon: presetTrail.trailheadLon || -121.735,
      alt: presetTrail.elevationProfile[0]?.elevationM || 1640,
      accuracy: 2,
      speed: null,
      status: "TRAILHEAD BASELINE",
      isLive: false,
    });
  };

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      audioDispatcher.stopSOS();
    };
  }, []);

  const toggleSos = (mode: "ALPINE_6" | "MORSE_SOS") => {
    if (isSosActive && sosMode === mode) {
      audioDispatcher.stopSOS();
      setIsSosActive(false);
      setIsStrobeActive(false);
      return;
    }

    audioDispatcher.stopSOS();
    setSosMode(mode);

    if (mode === "ALPINE_6") {
      audioDispatcher.toggleAlpineSOS(
        (active) => setIsSosActive(active),
        (flash) => setIsStrobeActive(flash)
      );
    } else {
      audioDispatcher.toggleMorseSOS(
        (active) => setIsSosActive(active),
        (flash) => setIsStrobeActive(flash)
      );
    }
  };

  const handleAddCustomWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWpTitle) return;

    const newWp: Waypoint = {
      id: `custom-wp-${Date.now()}`,
      title: newWpTitle,
      elevationM: Number(newWpElev) || 1500,
      distanceKm: presetTrail.distanceKm + (customWaypoints.length + 1) * 1.5,
      landmark: newWpLandmark || "Custom Trail Marker",
      instruction: newWpInstruction || "Continue navigation along ridge",
      estimatedArrival: "+Custom",
      lat: newWpLat ? parseFloat(newWpLat) : gpsCoords.lat,
      lon: newWpLon ? parseFloat(newWpLon) : gpsCoords.lon,
    };

    const updated = [...customWaypoints, newWp];
    setCustomWaypoints(updated);
    try {
      localStorage.setItem(`hushhike_custom_wp_${selectedTrailId}`, JSON.stringify(updated));
    } catch {
      // storage
    }

    setNewWpTitle("");
    setNewWpLandmark("");
    setNewWpInstruction("");
    setNewWpLat("");
    setNewWpLon("");
    setIsAddWpModalOpen(false);
  };

  return (
    <div className={`field-mode-root ${isNightRedMode ? "red-vision" : ""}`}>
      {/* Visual Emergency Screen Strobe Overlay */}
      {isStrobeActive && (
        <div className="sos-strobe-overlay" onClick={() => setIsStrobeActive(false)}>
          <div className="strobe-inner">
            <ShieldAlert size={48} />
            <div className="strobe-text">ALPINE DISTRESS BEACON TRANSMITTING</div>
            <div className="strobe-sub">VISUAL STROBE ACTIVE // 6 BLASTS / MIN</div>
          </div>
        </div>
      )}

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
              <span className="brand-meta">LIVE TACTICAL FIELD NAV</span>
            </div>
          </div>

          <nav className="nav-links-menu">
            <Link href="/" className="nav-menu-link">
              COCKPIT
            </Link>
            <Link href="/field" className="nav-menu-link active">
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
            {/* Night Red Mode Toggle */}
            <button
              onClick={() => setIsNightRedMode(!isNightRedMode)}
              className={`tactile-btn ${isNightRedMode ? "active-red" : ""}`}
              title="Toggle Night Vision Red Monochromatic Mode (Preserves Rhodopsin)"
            >
              <Eye size={13} />
              <span>{isNightRedMode ? "DAYLIGHT SPECTRUM" : "NIGHT RED HUD"}</span>
            </button>

            {/* Alpine SOS Distress Beacon */}
            <button
              onClick={() => toggleSos("ALPINE_6")}
              className={`tactile-btn sos-btn ${isSosActive && sosMode === "ALPINE_6" ? "sounding" : ""}`}
              title="Alpine International Distress Signal (6 blasts per minute SAR standard)"
            >
              <ShieldAlert size={13} />
              <span>{isSosActive && sosMode === "ALPINE_6" ? "STOP BEACON" : "ALPINE SOS (6/MIN)"}</span>
            </button>

            {/* Morse SOS */}
            <button
              onClick={() => toggleSos("MORSE_SOS")}
              className={`tactile-btn sos-btn ${isSosActive && sosMode === "MORSE_SOS" ? "sounding" : ""}`}
              title="International Morse Code SOS (... --- ...)"
            >
              <Zap size={13} />
              <span>{isSosActive && sosMode === "MORSE_SOS" ? "STOP MORSE" : "MORSE SOS"}</span>
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
                setGpsCoords((prev) => ({
                  ...prev,
                  lat: t.trailheadLat || prev.lat,
                  lon: t.trailheadLon || prev.lon,
                  alt: t.elevationProfile[0]?.elevationM || prev.alt,
                  status: "TRAILHEAD BASELINE",
                  isLive: false,
                }));
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
            <span className="val text-crimson">
              {solar.turnaroundTime}
            </span>
          </div>
          <div className="strip-item">
            <span>NEXT WAYPOINT:</span>
            <span className="val text-mint">
              {targetNav.distanceKm > 0 ? `${targetNav.distanceKm} km` : "ON SUMMIT"}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Field Instrument Layout */}
      <main className="cockpit-main">
        <div className="cockpit-deck-grid">
          {/* COLUMN A: COMPASS DIAL & SATELLITE TELEMETRY */}
          <div className="deck-column">
            {/* Real Compass Instrument Dial */}
            <div className="card-panel compass-panel">
              <div className="card-title-row">
                <div className="title-tag">
                  <Navigation size={15} className="text-mint" />
                  <span>Bearing Instrument & Target Bug</span>
                </div>
                <span className="mono-spec">MAGNETIC AZIMUTH</span>
              </div>

              {/* Digital Compass Ring */}
              <div className="compass-dial-wrapper">
                <div
                  className="compass-dial"
                  style={{ transform: `rotate(${-headingDeg}deg)` }}
                >
                  <div className="compass-mark north">N</div>
                  <div className="compass-mark east">E</div>
                  <div className="compass-mark south">S</div>
                  <div className="compass-mark west">W</div>
                  <div className="compass-needle" />

                  {/* Target Waypoint Heading Bug */}
                  {targetNav.bearingDeg !== undefined && (
                    <div
                      className="compass-target-bug"
                      style={{
                        transform: `rotate(${targetNav.bearingDeg}deg)`,
                      }}
                      title={`Target Landmark Bearing: ${targetNav.bearingDeg}°`}
                    >
                      <div className="bug-marker">▲</div>
                    </div>
                  )}
                </div>

                <div className="compass-digital-readout">
                  <span className="bearing-val">{headingDeg}°</span>
                  <span className="bearing-cardinal">{getCardinalDirection(headingDeg)}</span>
                  <div className="bearing-steering-hint">
                    <Target size={11} className="inline mr-1 text-mint" />
                    <span>TARGET: {targetNav.bearingDeg}° ({targetNav.cardinal})</span>
                  </div>
                  <div className="steering-directive">
                    {targetNav.relativeSteer.instruction}
                  </div>
                </div>
              </div>

              {/* Manual Bearing Scrubber (For devices without gyroscope) */}
              <div className="input-group" style={{ marginTop: "1rem" }}>
                <div className="input-label">
                  <span>Manual Azimuth Offset</span>
                  <span className="val-tag">{headingDeg}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={headingDeg}
                  onChange={(e) => setHeadingDeg(parseInt(e.target.value))}
                  className="custom-range"
                />
              </div>

              {/* Live GPS Telemetry Box */}
              <div className="gps-telemetry-box">
                <div className="gps-header">
                  <div className="gps-title">
                    <Radio size={13} className="text-amber" />
                    <span>SATELLITE POSITION & TELEMETRY</span>
                  </div>
                  <div className="gps-btn-group">
                    <button
                      onClick={toggleLiveGpsTracking}
                      className={`tactile-btn outline ${isTrackingGps ? "active-green" : ""}`}
                    >
                      <LocateFixed size={12} />
                      <span>{isTrackingGps ? "PAUSE GPS" : "START LIVE GPS"}</span>
                    </button>
                    <button
                      onClick={setBaselineTrailheadCoords}
                      className="tactile-btn outline"
                      title="Reset to Trailhead Baseline"
                    >
                      <span>RESET BASE</span>
                    </button>
                  </div>
                </div>

                <div className="gps-grid">
                  <div className="gps-cell">
                    <span className="lbl">LATITUDE</span>
                    <span className="val">{gpsCoords.lat.toFixed(5)}° N</span>
                  </div>
                  <div className="gps-cell">
                    <span className="lbl">LONGITUDE</span>
                    <span className="val">{Math.abs(gpsCoords.lon).toFixed(5)}° W</span>
                  </div>
                  <div className="gps-cell">
                    <span className="lbl">ELEVATION</span>
                    <span className="val">+{gpsCoords.alt}m</span>
                  </div>
                  <div className="gps-cell">
                    <span className="lbl">GPS ACCURACY</span>
                    <span className="val">±{gpsCoords.accuracy}m</span>
                  </div>
                  <div className="gps-cell full-width">
                    <span className="lbl">LOCK STATUS</span>
                    <span className={`val ${gpsCoords.isLive ? "text-mint font-bold" : "text-amber"}`}>
                      {gpsCoords.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN B: WAYPOINT STEPPER & DUSK COUNTDOWN */}
          <div className="deck-column">
            {/* Dusk Deadline Countdown Box */}
            <div className={`card-panel countdown-panel ${solar.isSunsetDeficit ? "deficit" : ""}`}>
              <div className="card-title-row">
                <div className="title-tag">
                  <Sunset size={15} className="text-amber" />
                  <span>Mountain Dusk Envelope & Cutoff</span>
                </div>
                <span className="mono-spec">CUTOFF: {solar.turnaroundTime}</span>
              </div>

              <div className="dusk-countdown-banner">
                <div className="countdown-number">
                  {Math.floor(solar.sunlightRemainingMin / 60)}h{" "}
                  {(solar.sunlightRemainingMin % 60).toString().padStart(2, "0")}m
                </div>
                <div className="countdown-label">
                  DAYLIGHT REMAINING UNTIL RIDGE SHADOW
                </div>
              </div>

              <div className="solar-mandate-box">
                <span className="mandate-highlight">SURVIVAL MANDATE:</span> If summit is not reached by{" "}
                <strong>{solar.turnaroundTime}</strong>, reverse course immediately. Ridge darkness arrives in total blackout without twilight gradation.
              </div>
            </div>

            {/* Tactical Waypoint Progress Stepper */}
            <div className="card-panel">
              <div className="card-title-row">
                <div className="title-tag">
                  <CheckCircle2 size={15} className="text-mint" />
                  <span>Field Waypoint Stepper ({allWaypoints.length})</span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setIsAddWpModalOpen(true)}
                    className="tactile-btn outline"
                    style={{ padding: "3px 8px", fontSize: "0.68rem" }}
                  >
                    <Plus size={11} />
                    <span>ADD CUSTOM WP</span>
                  </button>
                </div>
              </div>

              <div className="waypoint-stepper-list">
                {allWaypoints.map((wp, idx) => {
                  const isReached = !!reachedWaypoints[wp.id];
                  const isCurrentTarget = nextPendingWaypoint?.id === wp.id;

                  return (
                    <div
                      key={wp.id}
                      onClick={() => toggleWaypointReached(wp.id)}
                      className={`stepper-item ${isReached ? "reached" : ""} ${isCurrentTarget ? "active-target" : ""}`}
                    >
                      <div className="stepper-badge">{isReached ? "✓" : idx + 1}</div>
                      <div className="stepper-body">
                        <div className="stepper-title-row">
                          <span className="stepper-title">
                            {wp.title}
                            {isCurrentTarget && (
                              <span className="target-pill">ACTIVE TARGET</span>
                            )}
                          </span>
                          <span className="stepper-alt">+{wp.elevationM}m</span>
                        </div>
                        <div className="stepper-cue">
                          {wp.landmark} ↳ {wp.instruction}
                        </div>
                        {wp.lat && wp.lon && (
                          <div className="stepper-coords">
                            {wp.lat.toFixed(4)}°N, {Math.abs(wp.lon).toFixed(4)}°W
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Custom Waypoint Modal */}
      {isAddWpModalOpen && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <Plus size={15} className="text-mint" />
                <span>Add Custom Field Waypoint</span>
              </div>
              <button
                onClick={() => setIsAddWpModalOpen(false)}
                className="modal-close-btn"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomWaypoint} className="modal-form">
              <div className="form-field">
                <label>Waypoint Title / Landmark Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Col Saddle Cairn"
                  value={newWpTitle}
                  onChange={(e) => setNewWpTitle(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label>Elevation (Meters)</label>
                  <input
                    type="number"
                    value={newWpElev}
                    onChange={(e) => setNewWpElev(parseInt(e.target.value))}
                    className="modal-input"
                  />
                </div>
                <div className="form-field">
                  <label>Coordinates (Optional Lat, Lon)</label>
                  <div className="coords-dual-input">
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lat (38.58)"
                      value={newWpLat}
                      onChange={(e) => setNewWpLat(e.target.value)}
                      className="modal-input"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Lon (-78.35)"
                      value={newWpLon}
                      onChange={(e) => setNewWpLon(e.target.value)}
                      className="modal-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label>Visual Physical Landmark Cue</label>
                <input
                  type="text"
                  placeholder="e.g. Blazed pine stump next to glacial creek"
                  value={newWpLandmark}
                  onChange={(e) => setNewWpLandmark(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-field">
                <label>Tactile Navigation Instruction</label>
                <input
                  type="text"
                  placeholder="e.g. Bear 280° West across stone talus"
                  value={newWpInstruction}
                  onChange={(e) => setNewWpInstruction(e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsAddWpModalOpen(false)}
                  className="tactile-btn outline"
                >
                  Cancel
                </button>
                <button type="submit" className="tactile-btn active-green">
                  Save Waypoint to Offline Storage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
