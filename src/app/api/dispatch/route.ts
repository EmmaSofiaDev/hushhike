import { NextResponse } from "next/server";
import { mastra } from "../../../mastra";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const workflow = mastra.getWorkflow("wildernessDispatchWorkflow");
    if (!workflow) {
      return NextResponse.json({ error: "Mastra workflow not registered" }, { status: 500 });
    }

    const run = await workflow.createRun();
    const response = await run.start({
      inputData: {
        trailName: body.trailName || "Mt. Washington Alpine Col",
        latitude: body.latitude || 44.2704,
        longitude: body.longitude || -71.3033,
        departureTime: body.departureTime || "08:00",
        distanceKm: Number(body.distanceKm) || 6.8,
        elevationGainM: Number(body.elevationGainM) || 1280,
        elevationLossM: Number(body.elevationLossM) || 40,
        waterCarriedL: Number(body.waterCarriedL) || 2.0,
        hasHeadlamp: Boolean(body.hasHeadlamp),
        hasEmergencyBivy: Boolean(body.hasEmergencyBivy),
        ruggedness: body.ruggedness || "CLASS_3_SCRAMBLE",
        hikingPaceMinKm: Number(body.hikingPaceMinKm) || 14,
      },
    });

    if (response.status === "success") {
      return NextResponse.json({
        success: true,
        status: response.status,
        runId: run.runId,
        result: response.result,
        steps: response.stepExecutionPath,
      });
    } else {
      return NextResponse.json(
        { success: false, status: response.status, runId: run.runId, error: "Workflow failed" },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("Mastra API Execution Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Workflow execution failed" },
      { status: 500 }
    );
  }
}
