import { stopSimulationIntegrating } from "../services/simulationServices.js";
import { updateSimulation } from "./simulationRenderer.js";

let simulationUpdatingPromise;
let simulationIsUpdating;

export async function updateSimulationWithPriority(preRequestFunction) {
    stopSimulationIntegrating();
    await runSimulationUpdate(preRequestFunction);
}

export async function runSimulationUpdate(preRequestFunction) {
    if (simulationIsUpdating) {
        await simulationUpdatingPromise;
    }

    if (preRequestFunction) {
        preRequestFunction();
    }

    simulationUpdatingPromise = new Promise(async (resolve) => {
        simulationIsUpdating = true;
        await updateSimulation();
        simulationIsUpdating = false;
        resolve();
    });
}
