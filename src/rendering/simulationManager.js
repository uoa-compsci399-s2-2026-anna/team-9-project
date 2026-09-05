import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { 
    setRunning, 
    setFrozen,
    setSimulationState,
    toggleObject,
} from "../shared/simulationState.js";
// TODO: consider splitting state and rendering?
import { 
    init, 
    stepForward, 
    stepBack,
    resetView, 
    setLabelsVisibility, 
    setObjectVisibility,
    setFontSize,
    setFontFamily,
    toggleSimulationDarkMode,
} from "./simulationRenderer.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;
init(currentSystem);

bus.subscribe(EVENTS.SIM.TOGGLE, (event) => {
    setRunning(event.detail.start);
});

bus.subscribe(EVENTS.SIM.FREEZE, (event) => {
    setFrozen(event.detail.freeze);
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
});

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
    const { value } = event.detail;

    // Update the persisted state
    setSimulationState("labelsShown", value);
    // Update the simulation to show/hide labels
    setLabelsVisibility(value);
});

// Objects

bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    const { system, name, value } = event.detail;

    // Update the persisted state
    toggleObject(system, name, value);
    // Update the simulation to show/hide the object (if it is in the simulation)
    setObjectVisibility(name, value);
})

// Font family
bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setFontFamily(event.detail.font);
})

// Text size
bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setFontSize(event.detail.textSize);
});

// Dark mode
bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    toggleSimulationDarkMode(event.detail.darkMode);
});
