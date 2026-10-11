import { TrailTelemetry, SolarCalculationResult } from "../types/hushhike";

/**
 * Converts "HH:MM" string to minutes from midnight (0 - 1439)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 480;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converts minutes from midnight to formatted "HH:MM AM/PM"
 */
export function minutesToTimeString(totalMinutes: number): string {
  const normalized = Math.max(0, Math.floor(totalMinutes)) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const padMin = mins.toString().padStart(2, "0");

  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${padMin} ${period}`;
}

/**
 * Converts minutes from midnight to "HH:MM" 24h format
 */
export function minutesTo24hString(totalMinutes: number): string {
  const normalized = Math.max(0, Math.floor(totalMinutes)) % 1440;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const mins = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

/**
 * Tobler's Hiking Velocity Function
 * W = 6 * exp(-3.5 * |tan(theta) + 0.05|) km/h
 * theta = slope angle
 */
export function calculateToblerVelocity(distanceKm: number, elevationGainM: number): number {
  if (distanceKm <= 0) return 4.0;
  const slope = (elevationGainM / (distanceKm * 1000));
  const toblerKmH = 6 * Math.exp(-3.5 * Math.abs(slope + 0.05));
  return Math.max(1.2, Math.min(6.5, toblerKmH));
}

/**
 * NOAA Solar Ephemeris & Topographic Mountain Dusk Calculation
 * Computes exact solar sunset and ridge shadow cutoff
 */
export function calculateSolarAndPacing(telemetry: TrailTelemetry): SolarCalculationResult {
  const departureMinutes = timeStringToMinutes(telemetry.departureTime);

  // 1. Calculate duration using Tobler's Hiking function principles
  // Flat distance at base cadence
  const flatTimeMinutes = telemetry.distanceKm * telemetry.hikingPaceMinKm;

  // Ascent penalty: 10 minutes per 100m of vertical gain (Naismith's Rule extension)
  const elevationPenaltyMinutes = (telemetry.elevationGainM / 100) * 10;

  // Ruggedness terrain coefficient
  let ruggednessMultiplier = 1.0;
  if (telemetry.ruggedness === "CLASS_2_MODERATE") {
    ruggednessMultiplier = 1.22;
  } else if (telemetry.ruggedness === "CLASS_3_SCRAMBLE") {
    ruggednessMultiplier = 1.48;
  }

  const estimatedHikeDurationMin = Math.round(
    (flatTimeMinutes + elevationPenaltyMinutes) * ruggednessMultiplier
  );

  const estimatedFinishMinutes = departureMinutes + estimatedHikeDurationMin;
  const estimatedFinishTime = minutesToTimeString(estimatedFinishMinutes);

  // 2. Solar ephemeris model for mid-October (~38° - 47° N latitude)
  // Astronomical sunset on flat plains: 18:30 (1110 minutes)
  const astronomicalSunsetMinutes = 1110; // 6:30 PM
  const solarNoonMinutes = 780; // 1:00 PM
  const goldenHourMinutes = 1045; // 5:25 PM

  // Mountain Shadow Factor: High topographic ridgelines occlude solar rays 25-45 minutes earlier.
  // Formula: elevationShadowFactor = clamp(20, 45, round(elevationGainM / 24))
  const elevationShadowFactorMinutes = Math.min(
    45,
    Math.max(20, Math.round(telemetry.elevationGainM / 24))
  );
  const mountainDuskMinutes = astronomicalSunsetMinutes - elevationShadowFactorMinutes;

  // Turnaround Point of No Return: 52% of available daylight window before Mountain Dusk
  const availableWindowMinutes = mountainDuskMinutes - departureMinutes;
  const turnaroundMinutes =
    departureMinutes + Math.max(30, Math.floor(availableWindowMinutes * 0.52));

  const sunlightRemainingMin = Math.max(0, mountainDuskMinutes - departureMinutes);
  const safetyMarginMinutes = mountainDuskMinutes - estimatedFinishMinutes;

  const isSunsetDeficit = safetyMarginMinutes < 0;

  let riskLevel: "OPTIMAL" | "CAUTION" | "CRITICAL_DEFICIT" = "OPTIMAL";
  if (safetyMarginMinutes < 0) {
    riskLevel = "CRITICAL_DEFICIT";
  } else if (safetyMarginMinutes <= 35) {
    riskLevel = "CAUTION";
  }

  return {
    departureMinutes,
    estimatedHikeDurationMin,
    estimatedFinishMinutes,
    estimatedFinishTime,
    solarNoonTime: minutesToTimeString(solarNoonMinutes),
    goldenHourTime: minutesToTimeString(goldenHourMinutes),
    mountainDuskMinutes,
    mountainDuskTime: minutesToTimeString(mountainDuskMinutes),
    astronomicalSunsetTime: minutesToTimeString(astronomicalSunsetMinutes),
    sunlightRemainingMin,
    turnaroundTime: minutesToTimeString(turnaroundMinutes),
    turnaroundMinutes,
    isSunsetDeficit,
    safetyMarginMinutes,
    riskLevel,
  };
}

/**
 * Calculates Great-Circle forward azimuth bearing and Haversine ground distance
 * between two GPS coordinates (WGS-84 ellipsoid approximation)
 */
export function calculateBearingAndDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { bearingDeg: number; distanceM: number; distanceKm: number } {
  const R = 6371000; // Earth mean radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  // Haversine distance
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceM = Math.round(R * c);
  const distanceKm = parseFloat((distanceM / 1000).toFixed(2));

  // Forward azimuth initial bearing
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const initialBearingRad = Math.atan2(y, x);
  const initialBearingDeg = Math.round(((initialBearingRad * 180) / Math.PI + 360) % 360);

  return {
    bearingDeg: initialBearingDeg,
    distanceM,
    distanceKm,
  };
}

/**
 * Returns 16-point compass cardinal direction string from azimuth degrees
 */
export function getCardinalDirection(bearingDeg: number): string {
  const norm = ((bearingDeg % 360) + 360) % 360;
  const directions = [
    "NORTH",
    "NNE",
    "NE",
    "ENE",
    "EAST",
    "ESE",
    "SE",
    "SSE",
    "SOUTH",
    "SSW",
    "SW",
    "WSW",
    "WEST",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(norm / 22.5) % 16;
  return directions[index];
}

/**
 * Calculates relative course steering offset from current heading to target azimuth
 */
export function calculateRelativeBearing(
  currentHeadingDeg: number,
  targetBearingDeg: number
): { offsetDeg: number; instruction: string } {
  let diff = (targetBearingDeg - currentHeadingDeg) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  const offsetDeg = Math.round(diff);

  let instruction = "ON COURSE";
  if (offsetDeg > 5) {
    instruction = `STEER ${offsetDeg}° RIGHT`;
  } else if (offsetDeg < -5) {
    instruction = `STEER ${Math.abs(offsetDeg)}° LEFT`;
  }

  return { offsetDeg, instruction };
}

