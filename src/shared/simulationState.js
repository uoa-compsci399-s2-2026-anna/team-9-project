import { timeToMilliseconds } from "../utils/utils.js";

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

// Note: Initial state is also the default state since this state is not persisted between application runs
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
 * Gets the simulation speed per second converted to milliseconds.
 * 
 * @returns {number} The simulation speed per second in milliseconds
 */
export function getSimulationSpeedMilliseconds() {
    return timeToMilliseconds(simulationState.simulationSpeed, simulationState.simulationSpeedUnit);
}

/**
 * Gets the stored simulation time for a system.
 *
 * @param {string} system Name of the system
 * @returns {number} The stored simulation time for the system, in
 * milliseconds since the Unix epoch, or the current time if none is stored
 */
export function getSimulationTime(system) {
    simulationState.simulationTimes ??= {};
    return simulationState.simulationTimes[system] ?? Date.now();
}

/**
 * Persists the stored simulation time for the given system.
 *
 * @param {string} system Name of the system
 * @param {number} time Simulation time to store, in milliseconds since the Unix epoch
 */
export function setSimulationTime(system, time) {
    simulationState.simulationTimes ??= {};
    simulationState.simulationTimes[system] = time;
    persist();
}

/**
 * Persists the formatted simulation date for the given system
 * 
 * @param {string} system Name of the system
 * @param {string} formattedDate The formatted simulation date string to persist
 */
export function setFormattedSimulationDate(system, formattedDate) {
    simulationState.formattedSimulationDates ??= {}; 
    simulationState.formattedSimulationDates[system] = formattedDate;
    persist();
}

/**
 * Persists the elapsed days text for the given system
 * 
 * @param {string} system Name of the system
 * @param {string} elapsedDaysText The elapsed days text to persist
 */
export function setElapsedText(system, elapsedDaysText) {
    simulationState.elapsedDaysTexts ??= {};
    simulationState.elapsedDaysTexts[system] = elapsedDaysText;
    persist(); 
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
 * Get the object visibility changes necessary to reset the objects in the given system to their default
 * hidden states.
 *
 * @param {string} system Name of the system to get the objects from
 * @returns {{ objectName: string, isShown: boolean }[]} The objects whose visibility differs from the default
 */
export function getObjectVisibilityChanges(system) {
    // TODO: What if this DNE?
    const previouslyHidden = simulationState.hiddenObjects[system];
    // TODO: need default state
    const defaultHidden = initialState.hiddenObjects[system];
    console.log(previouslyHidden);
    console.log(defaultHidden);

    const changes = [];
    for (const name of previouslyHidden) {
        // Object was hidden, but it should now be shown
        if (!defaultHidden.includes(name)) {
            changes.push({ 
                objectName: name, 
                isShown: true, 
            });
        }
    }
    for (const name of defaultHidden) {
        // Object was shown, but it should be now hidden
        if (!previouslyHidden.includes(name)) {
            changes.push({ 
                objectName: name, 
                isShown: false,
            });
        }
    }

    return changes;
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
 * The running, frozen, and comparingToSolarSystem states only exist for the current simulation session, and are reset when the
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
