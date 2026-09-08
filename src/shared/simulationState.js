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
 * Gets the array of hidden object names for the given system
 * 
 * @param {string} system The system to get hidden objects for
 * @returns {string[]} The array of hidden object names for the system
 */
function getHiddenObjects(system) {
    simulationState.hiddenObjects ??= {};

    // Initialise the hidden objects array for this system if it doesn't exist yet
    if (!simulationState.hiddenObjects[system]) {
        simulationState.hiddenObjects[system] = [];
    }

    return simulationState.hiddenObjects[system];
}

/**
 * Shows or hides an object in the simulation.
 * 
 * @param {string} system The system that the object belongs to 
 * @param {string} object The name of the object to show or hide
 * @param {boolean} showObject Whether to show the object. If false, the object is hidden.
 */
export function toggleObject(system, object, showObject) {
    const hidden = getHiddenObjects(system);

    if (showObject) {
        // Unhide the object
        simulationState.hiddenObjects[system] = hidden.filter(o => o !== object);
    } else if (!simulationState.hiddenObjects[system].includes(object)) {
        hidden.push(object);
    }

    persist();
}

/**
 * Returns whether an object is hidden in the specified system.
 * 
 * @param {string} system The name of the system to check
 * @param {string} object The name of the object
 * @returns {boolean} `true` if the object is hidden; `false` otherwise
 */
export function isObjectHidden(system, object) {
    return getHiddenObjects(system).includes(object);
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

export let comparingToSolarSystem = false;
export function setComparingToSolarSystem(value) {
    comparingToSolarSystem = value;
}
