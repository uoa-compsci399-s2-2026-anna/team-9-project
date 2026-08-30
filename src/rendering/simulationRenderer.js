import * as state from "../shared/simulationState.js";

let lastRenderTime = null;
let currentSimulationTime;

/**
 * Initialises the requested system to render
 * 
 * @param {string} name System name
 */
export function init(name) {
    currentSimulationTime = Date.now();
    console.log(name);
}

export function render() {
    if (lastRenderTime === null) {
        lastRenderTime = Date.now();
    }

    const currentTime = Date.now();
    const deltaTime = currentTime - lastRenderTime;
    lastRenderTime = currentTime;

    console.log(deltaTime);

    // Invoke render() on the next frame
    if (state.running) {
        requestAnimationFrame(render);
    }
}