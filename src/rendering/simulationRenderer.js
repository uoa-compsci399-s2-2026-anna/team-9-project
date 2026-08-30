import * as state from "../shared/simulationState.js";
import { getSystemData } from "../services/simulationServices.js";

let lastRenderTime = null;
let currentSimulationTime = 0;
let currentSystem;

/**
 * Initialises the requested system to render
 * 
 * @param {string} name System name
 */
export function init(name) {
    currentSimulationTime = 0;
    currentSystem = name;
    console.log(name);
}

export async function render() {
    if (lastRenderTime === null) {
        lastRenderTime = Date.now();
    }

    const currentTime = Date.now();
    // Measure the change in time in seconds
    const deltaTime = (currentTime - lastRenderTime) / 1000;
    lastRenderTime = currentTime;

    currentSimulationTime += state.simulationSpeed * deltaTime;
    
    // TODO: currently rendering on every frame

    // TODO: There is currently a massive delay on the first load. This will be addresed by the backend.
    // Fetch data for the current system
    const systemData = await getSystemData(currentSystem, currentSimulationTime);
    console.log(systemData);

    console.log(deltaTime);

    // Invoke render() on the next frame
    if (state.running) {
        requestAnimationFrame(render);
    }
}