import { stopSimulationIntegrating } from "../../services/simulationServices.js";
import { updateSimulation } from "../simulationRenderer.js";

let simulationUpdatingPromise;
let simulationIsUpdating;

export async function updateSimulationWithPriority(postUpdateClosure) {
    stopSimulationIntegrating();
    await runSimulationUpdate(postUpdateClosure);
}

export async function runSimulationUpdate(postUpdateClosure) {
    if (simulationIsUpdating) {
        await simulationUpdatingPromise;
    }

    if (postUpdateClosure) postUpdateClosure();

    simulationUpdatingPromise = new Promise(async (resolve) => {
        simulationIsUpdating = true;
        await updateSimulation();
        simulationIsUpdating = false;
        resolve();
    });
}
