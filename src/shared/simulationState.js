import { timeToSeconds } from "../utils/utils.js";

const STORAGE_KEY = "simulationState";

const defaults = {
    simulationSpeed: 10,
    simulationSpeedUnit: "day",
    habitableZoneShown: true,
    orbitsShown: true,
    referenceGridShown: true,
    labelsShown: true, 
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
        simulationSpeedUnit,
        habitableZoneShown,
        orbitsShown,
        referenceGridShown,
        labelsShown,
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
    persist();
}

export function setSimulationSpeedUnit(unit) {
    simulationSpeedUnit = unit;
    simulationSpeedSeconds = timeToSeconds(simulationSpeed, simulationSpeedUnit);
    persist();
}

// View settings
export let habitableZoneShown = initial.habitableZoneShown;
export let orbitsShown = initial.orbitsShown;
export let referenceGridShown = initial.referenceGridShown;
export let labelsShown = initial.labelsShown;

export function setHabitableZoneShown(value) {
    habitableZoneShown = value;
    persist();
}

export function setOrbitsShown(value) {
    orbitsShown = value;
    persist();
}

export function setReferenceGridShown(value) {
    referenceGridShown = value;
    persist();
}

export function setLabelsShown(value) {
    labelsShown = value;
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
