import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { 
    setSimulationState,
    toggleObject,
    setRunning, 
    setFrozen,
    setComparingToSolarSystem
} from "../shared/simulationState.js";

// Speed adjuster

bus.subscribe(EVENTS.SIM.ADJUST_SPEED, (event) => {
    setSimulationState("simulationSpeed", event.detail.speed);
});

bus.subscribe(EVENTS.SIM.ADJUST_SPEED_UNIT, (event) => {
    setSimulationState("simulationSpeedUnit", event.detail.unit);
});

// View settings

bus.subscribe(EVENTS.SIM.HABITABLE_ZONE_TOGGLE, (event) => {
    setSimulationState("habitableZoneShown", event.detail.value);
});

bus.subscribe(EVENTS.SIM.ORBITS_TOGGLE, (event) => {
    setSimulationState("orbitsShown", event.detail.value);
});

bus.subscribe(EVENTS.SIM.REFERENCE_GRID_TOGGLE, (event) => {
    setSimulationState("referenceGridShown", event.detail.value);
});

bus.subscribe(EVENTS.SIM.LABELS_TOGGLE, (event) => {
    setSimulationState("labelsShown", event.detail.value);
});

// Objects

bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    const { system, name, value } = event.detail;
    toggleObject(system, name, value);
});

// running, frozen, and comparingToSolarSystem are not persisted in the session

bus.subscribe(EVENTS.SIM.TOGGLE, (event) => {
    setRunning(event.detail.startSimulation);
});

// Freeze the simulation when the settings menu is opened (unfreeze when closed)
bus.subscribe(EVENTS.SETTINGS.MENU_TOGGLE, (event) => {
    setFrozen(event.detail.openMenu);
});

bus.subscribe(EVENTS.SIM.COMPARE_TO_SOLAR_SYSTEM, (event) => {
    setComparingToSolarSystem(event.detail.compare);
});
