import { createPersister, loadState } from "./persistentStore.js";

const STORAGE_KEY = "simulationState";

const defaults = {
    simulationSpeed: 1_000_000, // Around 11.57 days/second
};

const initial = loadState(STORAGE_KEY, sessionStorage, defaults);

export let simulationSpeed = initial.simulationSpeed;

const persist = createPersister(STORAGE_KEY, sessionStorage, () => ({
    simulationSpeed,
}));

export function setSimulationSpeed(value) {
    simulationSpeed = value;
    persist();
}

// Running and frozen states are not persisted

export let running = false;

export function setRunning(value) {
    running = value;
}

export let frozen = false;

export function setFrozen(value) {
    frozen = value;
}