import { timeToSeconds } from "../utils/utils.js";

function loadState() {
    const stateElement = document.getElementById("sim-state");
    return stateElement ? JSON.parse(stateElement.textContent) : {};
}

const initialState = loadState();

export const simulationState = { ...initialState };

function persist() {
    window.simulationStateAPI.set(simulationState);
}

export function setSimulationState(key, value) {
    if (!(key in simulationState)) {
        throw new Error(`Unknown simulation state key: ${key}`);
    }

    simulationState[key] = value;
    persist();
}

export function getSimulationSpeedSeconds() {
    return timeToSeconds(simulationState.simulationSpeed, simulationState.simulationSpeedUnit);
}

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

// Running and Frozen are not persisted in the session

export let running = false;
export function setRunning(value) {
    running = value;
}

export let frozen = false;
export function setFrozen(value) {
    frozen = value;
}
