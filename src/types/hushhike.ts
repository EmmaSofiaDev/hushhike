export type RuggednessTier = "CLASS_1_EASY" | "CLASS_2_MODERATE" | "CLASS_3_SCRAMBLE";

export interface Waypoint {
  id: string;
  distanceKm: number;
  elevationM: number;
  title: string;
  landmark: string;
  instruction: string;
  estimatedArrival: string;
  lat?: number;
  lon?: number;
}

export interface TrailPreset {
  id: string;
  name: string;
  location: string;
  distanceKm: number;
  elevationGainM: number;
  ruggedness: RuggednessTier;
  recommendedWaterL: number;
  defaultStartTime: string;
  trailheadLat?: number;
  trailheadLon?: number;
  waypoints: Waypoint[];
  elevationProfile: { km: number; elevationM: number }[];
}

export interface TrailTelemetry {
  trailName: string;
  distanceKm: number;
  elevationGainM: number;
  departureTime: string; // HH:MM
  hikingPaceMinKm: number; // base pace on flat ground
  waterCarriedL: number;
  ruggedness: RuggednessTier;
  hasHeadlamp: boolean;
}

export interface SolarCalculationResult {
  departureMinutes: number;
  estimatedHikeDurationMin: number;
  estimatedFinishMinutes: number;
  estimatedFinishTime: string;
  solarNoonTime: string;
  goldenHourTime: string;
  mountainDuskMinutes: number;
  mountainDuskTime: string;
  astronomicalSunsetTime: string;
  sunlightRemainingMin: number;
  turnaroundTime: string;
  turnaroundMinutes: number;
  isSunsetDeficit: boolean; // Finishes AFTER mountain dusk
  safetyMarginMinutes: number; // positive = arrives before dusk, negative = trapped in dark
  riskLevel: "OPTIMAL" | "CAUTION" | "CRITICAL_DEFICIT";
}

export interface MastraDispatchResult {
  dispatchId: string;
  timestamp: string;
  trailName: string;
  rangerVoiceScript: string;
  audioDurationSeconds: number;
  waterAdequacy: "ADEQUATE" | "BORDERLINE" | "DEFICIT";
  recommendedWaterL: number;
  estimatedCaloriesBurned: number;
  pacingSummary: string;
  keySafetyDirectives: string[];
  offlineTactileCardData: {
    cardId: string;
    solarDusk: string;
    turnaroundTime: string;
    peakElevationM: number;
    waypoints: Waypoint[];
  };
}
