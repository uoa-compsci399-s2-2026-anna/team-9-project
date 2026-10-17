import { updateSimulation } from "./simulationRenderer.js";
import { abortCurrentIntegration } from "../services/simulationServices.js";

// The handle to the non-blocked async function currently running
let simulationUpdateFunctionHandle;
// Whether or not a priority update is occurring
let priorityUpdateHappening = false;

/**
 * Update the positions of all objects in the current system.
 * Update the calendar to display the current simulation time.
 * Does not queue updates and blocks until the previous request occurs
 *
 * @param params The function's parameters object (optional named parameters)
 * @param {boolean} [params.priorityUpdate=false] Whether or not the update should force itself
 * @param {boolean} [params.forceCalendarUpdate=true] Whether or not to force an update to the calendar (bypasses the throttle)
 * @param {boolean} [params.preUpdateFunction=undefined] Function/closure that runs prior to the update so that the previous update does not intefer with it
 */
export async function doSimulationUpdate({
    priorityUpdate = false,
    forceCalendarUpdate = true,
    preUpdateFunction = undefined,
} = {}) {
    // Do not queue priority updates
    if (priorityUpdateHappening) {
        return;
    }

    // If the update is priority
    if (priorityUpdate) {
        priorityUpdateHappening = true;

        // End all integrations currently happening
        await abortCurrentIntegration();
    }

    // If an update is running wait for it to finish and return first
    if (simulationUpdateFunctionHandle) {
        await simulationUpdateFunctionHandle;
    }

    // If there is a function that should run before doing the update
    if (preUpdateFunction) {
        // Do it, i.e. update date to now
        preUpdateFunction();
    }

    // Run simulation update not but do not block (will happen when next request comes)
    simulationUpdateFunctionHandle = updateSimulation({
        priorityUpdate: priorityUpdate,
        forceCalendarUpdate: forceCalendarUpdate,
    });

    priorityUpdateHappening = false;
}
