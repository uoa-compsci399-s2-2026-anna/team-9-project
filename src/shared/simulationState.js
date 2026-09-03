import { timeToSeconds } from "../utils/utils.js";

const STORAGE_KEY = "simulationState";

const defaults = {
    simulationSpeed: 10,
    simulationSpeedUnit: "day",
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
        simulationSpeed, simulationSpeedUnit,
    }));
}

const initial = loadState();

// Simulation speed
export let simulationSpeed = initial.simulationSpeed;
export let simulationSpeedUnit = initial.simulationSpeedUnit;
export let simulationSpeedSeconds = timeToSeconds(simulationSpeed, simulationSpeedUnit); 

export function setSimulationSpeed(speed) {
    simulationSpeed = speed;
    simulationSpeedSeconds = timeToSeconds(simulationSpeed, simulationSpeedUnit);
    console.log(simulationSpeedSeconds);
    persist();
}

export function setSimulationSpeedUnit(unit) {
    simulationSpeedUnit = unit;
    simulationSpeedSeconds = timeToSeconds(simulationSpeed, simulationSpeedUnit);
    console.log(simulationSpeedSeconds);
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
