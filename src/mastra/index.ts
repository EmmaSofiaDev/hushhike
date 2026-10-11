import { Mastra } from "@mastra/core";
import { wildernessDispatchWorkflow } from "./workflows/wilderness-dispatch";

/**
 * HushHike Mastra Instance
 * Integrates agentic wilderness workflows for real-time hazard evaluation and safety dispatch.
 */
export const mastra = new Mastra({
  workflows: {
    wildernessDispatchWorkflow,
  },
});

export { wildernessDispatchWorkflow };
