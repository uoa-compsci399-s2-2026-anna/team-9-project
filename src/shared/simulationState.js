import { timeToSeconds } from "../utils/utils.js";

/** 
 * Loads the current simulation state from the simulation-state script element
 * in simulation.html. The state is provided by the simulation route in app.py,
 * which receives it from index.js where the current simulation state is stored 
 * in memory.
 * 
 * The simulation state is only persisted for the lifetime of the application 
 * and is not preserved between application loads.
 * 
 * @returns {Object} The current simulation state.
 * */
function loadState() {
    const simulationStateElement = document.getElementById("simulation-state");
    return simulationStateElement ? JSON.parse(simulationStateElement.textContent) : {};
}

const initialState = loadState();

export const simulationState = { ...initialState };

/**
 * Persist the current simulation state in the main process.
 */
function persist() {
    window.simulationStateAPI.set(simulationState);
}

/**
 * Updates a value in the simulation state and persists the change.
 * 
 * @param {string} key The name of the simulation state property to update
 * @param {*} value The new value for the property
 * @throws {Error} If the specified state property does not exist
 */
export function setSimulationState(key, value) {
    if (!(key in simulationState)) {
        throw new Error(`Unknown simulation state key: ${key}`);
    }

    simulationState[key] = value;
    persist();
}

/**
 * Gets the simulation speed converted to seconds.
 * 
 * @returns {number} The simulation speed in seconds
 */
export function getSimulationSpeedSeconds() {
    return timeToSeconds(simulationState.simulationSpeed, simulationState.simulationSpeedUnit);
}

/**
 * Shows or hides an object in the simulation.
 * 
 * @param {string} system The system that the object belongs to 
 * @param {string} object The name of the object to show or hide
 * @param {boolean} showObject Whether to show the object. If false, the object is hidden.
 */
export function toggleObject(system, object, showObject) {
    if (!simulationState.hiddenObjects[system]) {
        simulationState.hiddenObjects[system] = [];
    }

    if (showObject) {
        // Unhide the object
        simulationState.hiddenObjects[system] = simulationState.hiddenObjects[system].filter(o => o !== object);
    } else if (!simulationState.hiddenObjects[system].includes(object)) {
        simulationState.hiddenObjects[system].push(object);
    }

    persist();
}

/**
 * Returns whether an object is hidden in the specified system.
 * 
 * @param {string} system The system to check
 * @param {*} name The name of the object
 * @returns {boolean} `true` if the object is hidden; `false` otherwise
 */
export function isObjectHidden(system, name) {
    return simulationState.hiddenObjects[system].includes(name);
}

/**
 * The running and frozen states only exist for the current simulation session, and are reset when the
 * simulation is loaded again.
 */

export let running = false;
export function setRunning(value) {
    running = value;
}

export let frozen = false;
export function setFrozen(value) {
    frozen = value;
}
