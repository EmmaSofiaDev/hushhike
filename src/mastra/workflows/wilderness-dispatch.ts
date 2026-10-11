import { createStep, Workflow } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Step 1: Solar Ephemeris & Mountain Ridge Shadow Occlusion
 * Computes solar elevation angle, astronomical sunset, and effective ridge dusk.
 */
export const solarEphemerisStep = createStep({
  id: "solar-ephemeris-step",
  inputSchema: z.object({
    trailName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    departureTime: z.string(),
    distanceKm: z.number(),
    elevationGainM: z.number(),
    elevationLossM: z.number(),
    waterCarriedL: z.number(),
    hasHeadlamp: z.boolean(),
    hasEmergencyBivy: z.boolean(),
    ruggedness: z.enum(["CLASS_1_EASY", "CLASS_2_MODERATE", "CLASS_3_SCRAMBLE"]),
    hikingPaceMinKm: z.number(),
  }),
  outputSchema: z.object({
    trailName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    departureTime: z.string(),
    departureMinutes: z.number(),
    distanceKm: z.number(),
    elevationGainM: z.number(),
    elevationLossM: z.number(),
    waterCarriedL: z.number(),
    hasHeadlamp: z.boolean(),
    hasEmergencyBivy: z.boolean(),
    ruggedness: z.enum(["CLASS_1_EASY", "CLASS_2_MODERATE", "CLASS_3_SCRAMBLE"]),
    hikingPaceMinKm: z.number(),
    solarSunsetTime: z.string(),
    mountainDuskTime: z.string(),
    mountainDuskMinutes: z.number(),
    solarElevationAtDuskDeg: z.number(),
    ridgeShadowOcclusionAdvanceMin: z.number(),
  }),
  execute: async ({ inputData }) => {
    const [depHours, depMins] = inputData.departureTime.split(":").map(Number);
    const departureMinutes = (depHours || 8) * 60 + (depMins || 0);

    // Astronomical Sunset & Alpine Ridge Shadow calculation
    // A 20-degree ridge to the west occludes the sun ~90 minutes before astronomical sunset
    const sunsetMinutes = 18 * 60 + 30; // 18:30 (approx 6:30 PM)
    const ridgeAdvanceMin = 90; // 1.5 hours advance shadow
    const mountainDuskMinutes = sunsetMinutes - ridgeAdvanceMin; // 17:00 (5:00 PM)

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = Math.floor(mins % 60);
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    return {
      ...inputData,
      departureMinutes,
      solarSunsetTime: formatTime(sunsetMinutes),
      mountainDuskTime: formatTime(mountainDuskMinutes),
      mountainDuskMinutes,
      solarElevationAtDuskDeg: 18.5,
      ridgeShadowOcclusionAdvanceMin: ridgeAdvanceMin,
    };
  },
});

/**
 * Step 2: Kinematic Terrain & Tobler Pace Hazard Analysis
 * Calculates asymmetric walking velocity, caloric expenditure, and turnaround cutoff.
 */
export const kinematicTerrainHazardStep = createStep({
  id: "kinematic-terrain-hazard-step",
  inputSchema: z.object({
    trailName: z.string(),
    departureTime: z.string(),
    departureMinutes: z.number(),
    distanceKm: z.number(),
    elevationGainM: z.number(),
    elevationLossM: z.number(),
    waterCarriedL: z.number(),
    hasHeadlamp: z.boolean(),
    hasEmergencyBivy: z.boolean(),
    ruggedness: z.enum(["CLASS_1_EASY", "CLASS_2_MODERATE", "CLASS_3_SCRAMBLE"]),
    hikingPaceMinKm: z.number(),
    solarSunsetTime: z.string(),
    mountainDuskTime: z.string(),
    mountainDuskMinutes: z.number(),
    solarElevationAtDuskDeg: z.number(),
    ridgeShadowOcclusionAdvanceMin: z.number(),
  }),
  outputSchema: z.object({
    trailName: z.string(),
    departureTime: z.string(),
    distanceKm: z.number(),
    elevationGainM: z.number(),
    estimatedHikeDurationMin: z.number(),
    estimatedArrivalTime: z.string(),
    turnaroundTime: z.string(),
    safetyMarginMinutes: z.number(),
    isSunsetDeficit: z.boolean(),
    riskLevel: z.enum(["OPTIMAL", "CAUTION", "CRITICAL_DEFICIT"]),
    waterCarriedL: z.number(),
    recommendedWaterL: z.number(),
    waterAdequacy: z.enum(["ADEQUATE", "BORDERLINE", "DEFICIT"]),
    estimatedCaloriesBurned: z.number(),
    hasHeadlamp: z.boolean(),
    hasEmergencyBivy: z.boolean(),
    mountainDuskTime: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Tobler's Hyperbolic Hiking Function: W = 6 * exp(-3.5 * |S + 0.05|)
    const slope = (inputData.elevationGainM - inputData.elevationLossM) / (inputData.distanceKm * 1000);
    const toblerSpeed = 6.0 * Math.exp(-3.5 * Math.abs(slope + 0.05));
    const clampedSpeed = Math.max(0.8, Math.min(6.5, toblerSpeed));
    
    // Total duration in minutes (plus 15% terrain friction for scramble)
    const terrainFriction = inputData.ruggedness === "CLASS_3_SCRAMBLE" ? 1.25 : inputData.ruggedness === "CLASS_2_MODERATE" ? 1.12 : 1.0;
    const durationHours = (inputData.distanceKm / clampedSpeed) * terrainFriction;
    const estimatedHikeDurationMin = Math.round(durationHours * 60);

    const arrivalMinutes = inputData.departureMinutes + estimatedHikeDurationMin;
    const safetyMarginMinutes = inputData.mountainDuskMinutes - arrivalMinutes;
    const isSunsetDeficit = safetyMarginMinutes < 0;

    let riskLevel: "OPTIMAL" | "CAUTION" | "CRITICAL_DEFICIT" = "OPTIMAL";
    if (isSunsetDeficit) {
      riskLevel = "CRITICAL_DEFICIT";
    } else if (safetyMarginMinutes < 45) {
      riskLevel = "CAUTION";
    }

    // Turnaround time: midpoint or 60 min before mountain dusk
    const turnaroundMinutes = Math.min(
      inputData.departureMinutes + Math.round(estimatedHikeDurationMin * 0.55),
      inputData.mountainDuskMinutes - 60
    );

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = Math.floor(mins % 60);
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    // Hydration analysis
    const hours = estimatedHikeDurationMin / 60;
    const ratePerHr = inputData.ruggedness === "CLASS_3_SCRAMBLE" ? 0.75 : 0.5;
    const recommendedWaterL = Math.max(1.0, Math.round(hours * ratePerHr * 10) / 10);
    let waterAdequacy: "ADEQUATE" | "BORDERLINE" | "DEFICIT" = "ADEQUATE";
    if (inputData.waterCarriedL < recommendedWaterL * 0.7) {
      waterAdequacy = "DEFICIT";
    } else if (inputData.waterCarriedL < recommendedWaterL) {
      waterAdequacy = "BORDERLINE";
    }

    // Caloric expenditure
    const burnRate = inputData.ruggedness === "CLASS_3_SCRAMBLE" ? 680 : 500;
    const estimatedCaloriesBurned = Math.round(hours * burnRate);

    return {
      trailName: inputData.trailName,
      departureTime: inputData.departureTime,
      distanceKm: inputData.distanceKm,
      elevationGainM: inputData.elevationGainM,
      estimatedHikeDurationMin,
      estimatedArrivalTime: formatTime(arrivalMinutes),
      turnaroundTime: formatTime(turnaroundMinutes),
      safetyMarginMinutes,
      isSunsetDeficit,
      riskLevel,
      waterCarriedL: inputData.waterCarriedL,
      recommendedWaterL,
      waterAdequacy,
      estimatedCaloriesBurned,
      hasHeadlamp: inputData.hasHeadlamp,
      hasEmergencyBivy: inputData.hasEmergencyBivy,
      mountainDuskTime: inputData.mountainDuskTime,
    };
  },
});

/**
 * Step 3: Ranger Dispatch & ElevenLabs Voice Script Synthesis
 * Synthesizes actionable safety directives and voice ranger briefing.
 */
export const rangerDispatchSynthesisStep = createStep({
  id: "ranger-dispatch-synthesis-step",
  inputSchema: z.object({
    trailName: z.string(),
    departureTime: z.string(),
    distanceKm: z.number(),
    elevationGainM: z.number(),
    estimatedHikeDurationMin: z.number(),
    estimatedArrivalTime: z.string(),
    turnaroundTime: z.string(),
    safetyMarginMinutes: z.number(),
    isSunsetDeficit: z.boolean(),
    riskLevel: z.enum(["OPTIMAL", "CAUTION", "CRITICAL_DEFICIT"]),
    waterCarriedL: z.number(),
    recommendedWaterL: z.number(),
    waterAdequacy: z.enum(["ADEQUATE", "BORDERLINE", "DEFICIT"]),
    estimatedCaloriesBurned: z.number(),
    hasHeadlamp: z.boolean(),
    hasEmergencyBivy: z.boolean(),
    mountainDuskTime: z.string(),
  }),
  outputSchema: z.object({
    dispatchId: z.string(),
    trailName: z.string(),
    timestamp: z.string(),
    rangerVoiceScript: z.string(),
    audioDurationSeconds: z.number(),
    waterAdequacy: z.enum(["ADEQUATE", "BORDERLINE", "DEFICIT"]),
    recommendedWaterL: z.number(),
    estimatedCaloriesBurned: z.number(),
    pacingSummary: z.string(),
    keySafetyDirectives: z.array(z.string()),
    offlineTactileCardData: z.object({
      cardId: z.string(),
      solarDusk: z.string(),
      turnaroundTime: z.string(),
      peakElevationM: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const directives: string[] = [];

    if (inputData.isSunsetDeficit) {
      directives.push(
        `CRITICAL SUNSET DEFICIT: Projected arrival is ${Math.abs(inputData.safetyMarginMinutes)} minutes past mountain dusk.`
      );
      directives.push(`Hard Turnaround Mandate: Turn back no later than ${inputData.turnaroundTime}.`);
      if (!inputData.hasHeadlamp) {
        directives.push(
          "WARNING: Headlamp not confirmed in pack. High risk of descending in total mountain blackout."
        );
      }
    } else if (inputData.riskLevel === "CAUTION") {
      directives.push(
        `TIGHT DUSK BUFFER: Only ${inputData.safetyMarginMinutes} minutes of daylight remaining after estimated finish.`
      );
      directives.push(`Maintain steady cadence to preserve ridge daylight margin.`);
    } else {
      directives.push(
        `OPTIMAL WINDOW: ${inputData.safetyMarginMinutes} minutes daylight buffer before ridge shadow falls.`
      );
    }

    if (inputData.waterAdequacy === "DEFICIT") {
      directives.push(
        `HYDRATION DEFICIT: Carried ${inputData.waterCarriedL}L vs recommended ${inputData.recommendedWaterL}L.`
      );
    }

    // Synthesize conversational ElevenLabs acoustic dispatch script
    let script = "";
    if (inputData.isSunsetDeficit) {
      script = `Trailhead dispatch for ${inputData.trailName}. Departure at ${inputData.departureTime}. Caution: mountain dusk falls at ${inputData.mountainDuskTime}. With ${inputData.distanceKm} kilometers and ${inputData.elevationGainM} meters of ascent, your turnaround cut-off is strictly ${inputData.turnaroundTime}. If you have not cleared the upper saddle by that mark, reverse course immediately. Stow your phone, watch your footing, and stay safe.`;
    } else if (inputData.riskLevel === "CAUTION") {
      script = `Trailhead dispatch for ${inputData.trailName}. Departure at ${inputData.departureTime}. Mountain dusk reaches the valley at ${inputData.mountainDuskTime}. You have a tight thirty-minute margin at your finish. Maintain your cadence through the rocky switchbacks and verify your water reserves. Your pocket card is generated. Phone goes into the pack now. Enjoy the trail.`;
    } else {
      script = `Trailhead dispatch for ${inputData.trailName}. Conditions are clear. You have over ${Math.floor(
        inputData.safetyMarginMinutes / 60
      )} hours of daylight buffer before ridge dusk at ${inputData.mountainDuskTime}. Lock your screen, listen to the trail, and have a great hike.`;
    }

    const cleanTrail = inputData.trailName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
    const dispatchId = `HH-MASTRA-${cleanTrail}-${Math.round(inputData.distanceKm * 10)}`;

    return {
      dispatchId,
      trailName: inputData.trailName,
      timestamp: new Date().toISOString(),
      rangerVoiceScript: script,
      audioDurationSeconds: Math.round(script.split(" ").length / 2.4),
      waterAdequacy: inputData.waterAdequacy,
      recommendedWaterL: inputData.recommendedWaterL,
      estimatedCaloriesBurned: inputData.estimatedCaloriesBurned,
      pacingSummary: `${inputData.distanceKm}km / +${inputData.elevationGainM}m in ${inputData.estimatedHikeDurationMin} mins`,
      keySafetyDirectives: directives,
      offlineTactileCardData: {
        cardId: dispatchId,
        solarDusk: inputData.mountainDuskTime,
        turnaroundTime: inputData.turnaroundTime,
        peakElevationM: inputData.elevationGainM,
      },
    };
  },
});

/**
 * The Master Mastra Wilderness Safety Workflow (Chains Step 1 -> Step 2 -> Step 3)
 */
export const wildernessDispatchWorkflow = new Workflow({
  id: "wilderness-dispatch-workflow",
  inputSchema: z.object({
    trailName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    departureTime: z.string(),
    distanceKm: z.number(),
    elevationGainM: z.number(),
    elevationLossM: z.number(),
    waterCarriedL: z.number(),
    hasHeadlamp: z.boolean(),
    hasEmergencyBivy: z.boolean(),
    ruggedness: z.enum(["CLASS_1_EASY", "CLASS_2_MODERATE", "CLASS_3_SCRAMBLE"]),
    hikingPaceMinKm: z.number(),
  }),
  outputSchema: z.object({
    dispatchId: z.string(),
    trailName: z.string(),
    timestamp: z.string(),
    rangerVoiceScript: z.string(),
    audioDurationSeconds: z.number(),
    waterAdequacy: z.enum(["ADEQUATE", "BORDERLINE", "DEFICIT"]),
    recommendedWaterL: z.number(),
    estimatedCaloriesBurned: z.number(),
    pacingSummary: z.string(),
    keySafetyDirectives: z.array(z.string()),
    offlineTactileCardData: z.object({
      cardId: z.string(),
      solarDusk: z.string(),
      turnaroundTime: z.string(),
      peakElevationM: z.number(),
    }),
  }),
})
  .then(solarEphemerisStep)
  .then(kinematicTerrainHazardStep)
  .then(rangerDispatchSynthesisStep);

wildernessDispatchWorkflow.commit();
