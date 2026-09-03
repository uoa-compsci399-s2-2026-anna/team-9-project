import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { setRunning, setFrozen, setSimulationSpeedUnit, setHabitableZoneShown, setOrbitsShown, setReferenceGridShown, setLabelsShown } from "../shared/simulationState.js";
import { init, stepForward, stepBack, resetView } from "./simulationRenderer.js";
import { setSimulationSpeed, toggleObject } from "../shared/simulationState.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;
init(currentSystem);

bus.subscribe(EVENTS.SIM.START, () => {
    console.log("Started simulation");
    setRunning(true);
});

bus.subscribe(EVENTS.SIM.STOP, () => {
    console.log("Stopped simulation");
    setRunning(false);
});

bus.subscribe(EVENTS.SIM.UNFREEZE, () => {
    console.log("Unfroze simulation");
    setFrozen(false);
});

bus.subscribe(EVENTS.SIM.FREEZE, () => {
    console.log("Froze simulation");
    setFrozen(true);
});

// Speed adjuster

bus.subscribe(EVENTS.SIM.ADJUST_SPEED, (event) => {
    setSimulationSpeed(event.detail.speed);
});

bus.subscribe(EVENTS.SIM.ADJUST_SPEED_UNIT, (event) => {
    setSimulationSpeedUnit(event.detail.unit);
});

// Step forward/Step back

bus.subscribe(EVENTS.SIM.STEP_FORWARD, () => {
    stepForward();
});

bus.subscribe(EVENTS.SIM.STEP_BACK, () => {
    stepBack();
});

// Reset view

bus.subscribe(EVENTS.SIM.RESET_VIEW, () => {
    resetView();
})

// View settings

bus.subscribe(EVENTS.SIM.HABITABLE_ZONE_TOGGLE, (event) => {
    setHabitableZoneShown(event.detail.value);
});

bus.subscribe(EVENTS.SIM.ORBITS_TOGGLE, (event) => {
    setOrbitsShown(event.detail.value);
});

bus.subscribe(EVENTS.SIM.REFERENCE_GRID_TOGGLE, (event) => {
    setReferenceGridShown(event.detail.value);
});

bus.subscribe(EVENTS.SIM.LABELS_TOGGLE, (event) => {
    setLabelsShown(event.detail.value);
});

// Objects

bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    toggleObject(currentSystem, event.detail.object, event.detail.value);
})