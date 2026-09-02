const STORAGE_KEY = "simulationState";

const defaults = {
    simulationSpeed: 1_000_000, // Around 11.57 days/second
};

function loadState() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch {
        return { ...defaults };
    }
}

function persist() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        simulationSpeed,
    }));
}

const initial = loadState();

export let simulationSpeed = initial.simulationSpeed;

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
