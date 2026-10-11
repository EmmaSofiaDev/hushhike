import {
  TrailTelemetry,
  SolarCalculationResult,
  MastraDispatchResult,
  Waypoint,
} from "../types/hushhike";

/**
 * Executes Mastra-pattern workflow for wilderness safety synthesis
 */
export function executeMastraWorkflow(
  telemetry: TrailTelemetry,
  solar: SolarCalculationResult,
  presetWaypoints: Waypoint[]
): MastraDispatchResult {
  const hours = solar.estimatedHikeDurationMin / 60;

  // 1. Hydration Adequacy Analysis
  // Standard recommendation: 0.5L - 0.75L per active hour depending on terrain
  const ratePerHr = telemetry.ruggedness === "CLASS_3_SCRAMBLE" ? 0.7 : 0.5;
  const recommendedWaterL = Math.max(1.0, Math.round(hours * ratePerHr * 10) / 10);

  let waterAdequacy: "ADEQUATE" | "BORDERLINE" | "DEFICIT" = "ADEQUATE";
  if (telemetry.waterCarriedL < recommendedWaterL * 0.7) {
    waterAdequacy = "DEFICIT";
  } else if (telemetry.waterCarriedL < recommendedWaterL) {
    waterAdequacy = "BORDERLINE";
  }

  // 2. Caloric expenditure estimation (average 75kg hiker + 7kg pack)
  // ~450 kcal/hr on flats, up to 700 kcal/hr on steep scrambles
  const burnRate = telemetry.ruggedness === "CLASS_3_SCRAMBLE" ? 650 : 480;
  const estimatedCaloriesBurned = Math.round(hours * burnRate);

  // 3. Safety Directives
  const directives: string[] = [];

  if (solar.isSunsetDeficit) {
    directives.push(
      `CRITICAL SUNSET DEFICIT: Projected arrival is ${Math.abs(
        solar.safetyMarginMinutes
      )} minutes past mountain dusk.`
    );
    directives.push(`Hard Turnaround Mandate: Turn back no later than ${solar.turnaroundTime}.`);
    if (!telemetry.hasHeadlamp) {
      directives.push(
        "WARNING: Headlamp not confirmed in pack. You risk descending rocky terrain in total blackout."
      );
    }
  } else if (solar.riskLevel === "CAUTION") {
    directives.push(
      `TIGHT DUSK BUFFER: Only ${solar.safetyMarginMinutes} minutes of daylight remaining after estimated finish.`
    );
    directives.push(
      `Keep steady cadence (${telemetry.hikingPaceMinKm} min/km) to preserve safety margin.`
    );
  } else {
    directives.push(
      `OPTIMAL WINDOW: ${solar.safetyMarginMinutes} minutes daylight buffer before ridge shadow falls.`
    );
  }

  if (waterAdequacy === "DEFICIT") {
    directives.push(
      `HYDRATION DEFICIT: Carried ${telemetry.waterCarriedL}L vs recommended ${recommendedWaterL}L for ${solar.estimatedHikeDurationMin} minutes.`
    );
  }

  // 4. Generate ElevenLabs Ranger Audio Script
  // Natural, concise, calming ranger dispatch (< 45 seconds read time)
  let script = "";
  if (solar.isSunsetDeficit) {
    script = `Trailhead dispatch for ${telemetry.trailName}. Departure at ${telemetry.departureTime}. Caution: mountain dusk falls at ${solar.mountainDuskTime}. With ${telemetry.distanceKm} kilometers and ${telemetry.elevationGainM} meters of ascent, your turnaround cut-off is strictly ${solar.turnaroundTime}. If you have not cleared the upper saddle by that mark, reverse course immediately. Stow your phone, watch your footing, and stay safe.`;
  } else if (solar.riskLevel === "CAUTION") {
    script = `Trailhead dispatch for ${telemetry.trailName}. Departure at ${telemetry.departureTime}. Mountain dusk reaches the valley at ${solar.mountainDuskTime}. You have a tight thirty-minute margin at your finish. Maintain your cadence through the rocky switchbacks and verify your water reserves. Your pocket card is generated. Phone goes into the pack now. Enjoy the trail.`;
  } else {
    script = `Trailhead dispatch for ${telemetry.trailName}. Conditions are clear. You have over ${Math.floor(
      solar.safetyMarginMinutes / 60
    )} hours of daylight buffer before ridge dusk at ${solar.mountainDuskTime}. Pacing target is ${telemetry.hikingPaceMinKm} minutes per kilometer. Lock your screen, listen to the trail, and have a great hike.`;
  }

  // 5. Build Tactile Waypoint Schedule
  const calculatedWaypoints: Waypoint[] = presetWaypoints.map((wp, idx) => {
    // Pro-rate arrival minutes based on distance ratio
    const fraction = wp.distanceKm / telemetry.distanceKm;
    const waypointArrivalMins = Math.round(
      solar.departureMinutes + solar.estimatedHikeDurationMin * fraction
    );
    const arrivalTimeStr = `${Math.floor(waypointArrivalMins / 60) % 24}:${(
      waypointArrivalMins % 60
    )
      .toString()
      .padStart(2, "0")}`;

    return {
      ...wp,
      estimatedArrival: arrivalTimeStr,
    };
  });

  const cleanTrail = telemetry.trailName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  const dispatchId = `HH-${cleanTrail}-${Math.round(telemetry.distanceKm * 10)}`;
  const timestamp = typeof window !== "undefined" ? new Date().toISOString() : "2026-10-11T12:00:00.000Z";

  return {
    dispatchId,
    timestamp,
    trailName: telemetry.trailName,
    rangerVoiceScript: script,
    audioDurationSeconds: Math.round(script.split(" ").length / 2.4), // ~140 wpm
    waterAdequacy,
    recommendedWaterL,
    estimatedCaloriesBurned,
    pacingSummary: `${telemetry.distanceKm}km / +${telemetry.elevationGainM}m in ${solar.estimatedHikeDurationMin} mins`,
    keySafetyDirectives: directives,
    offlineTactileCardData: {
      cardId: dispatchId,
      solarDusk: solar.mountainDuskTime,
      turnaroundTime: solar.turnaroundTime,
      peakElevationM: Math.max(...presetWaypoints.map((w) => w.elevationM), telemetry.elevationGainM),
      waypoints: calculatedWaypoints,
    },
  };
}
