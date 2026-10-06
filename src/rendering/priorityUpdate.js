import { stopSimulationIntegrating } from "../services/simulationServices.js";
import { updateSimulation } from "./simulationRenderer.js";

let simulationUpdatingPromise;
let simulationIsUpdating;

/**
 * Updates the simulation with priority, waiting for the last update to take effect first.
 * Uses async event loop to prevent polling.
 * Kills the other integration first (if there is one).
 *
 * @param preRequestFunction The function that runs to set state prior to running the update
 */
export async function updateSimulationWithPriority(preRequestFunction) {
    stopSimulationIntegrating();
    await runSimulationUpdate(preRequestFunction);
}

/**
 * Updates the simulation waiting for the last update to take effect first.
 * Uses async event loop to prevent polling.
 *
 * @param preRequestFunction The function that runs to set state prior to running the update
 */
export async function runSimulationUpdate(
    preRequestFunction,
    forceCalendarUpdate = true,
) {
    if (simulationIsUpdating) {
        await simulationUpdatingPromise;
    }

    if (preRequestFunction) {
        preRequestFunction();
    }

    simulationUpdatingPromise = new Promise(async (resolve) => {
        simulationIsUpdating = true;
        await updateSimulation((forceCalendarUpdate = forceCalendarUpdate));
        simulationIsUpdating = false;
        resolve();
    });
}
