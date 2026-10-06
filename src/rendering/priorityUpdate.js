import { stopSimulationIntegrating } from "../services/simulationServices.js";
import { updateSimulation } from "./simulationRenderer.js";

let simulationUpdatingPromise;
let simulationIsUpdating;

/**
 * Updates the simulation with priority, waiting for the last update to take effect first.
 * Uses async event loop to prevent polling.
 * Kills the other integration first (if there is one).
 *
 * @param params An object containing the parameters
 * @param params.preRequestFunction The function that runs to set state prior to running the update
 * @param params.forceCalendarUpdate Whether or not to force an update to the calendar (bypasses the throttle)
 */
export async function updateSimulationWithPriority(params) {
    stopSimulationIntegrating();
    await runSimulationUpdate(params);
}

/**
 * Updates the simulation waiting for the last update to take effect first.
 * Uses async event loop to prevent polling.
 *
 * @param params An object containing the parameters
 * @param params.preRequestFunction The function that runs to set state prior to running the update
 * @param params.forceCalendarUpdate Whether or not to force an update to the calendar (bypasses the throttle)
 */
export async function runSimulationUpdate({
    preRequestFunction = undefined,
    forceCalendarUpdate = true,
}) {
    if (simulationIsUpdating) {
        await simulationUpdatingPromise;
    }

    if (preRequestFunction) {
        preRequestFunction();
    }

    simulationUpdatingPromise = new Promise(async (resolve) => {
        simulationIsUpdating = true;
        await updateSimulation(forceCalendarUpdate);
        simulationIsUpdating = false;
        resolve();
    });
}
