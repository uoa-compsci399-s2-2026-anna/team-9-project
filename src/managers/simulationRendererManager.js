import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { 
    init, 
    stepForward, 
    stepBack,
    resetView, 
    setLabelsVisibility,
    setOrbitsVisibility,
    setObjectVisibility,
    setFontSize,
    setFontFamily,
    toggleSimulationDarkMode,
} from "../rendering/simulationRenderer.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;
init(currentSystem);

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

// View settings

bus.subscribe(EVENTS.SIM.LABELS_TOGGLE, (event) => {
    setLabelsVisibility(event.detail.value);
});

bus.subscribe(EVENTS.SIM.ORBITS_TOGGLE, (event) => {
    setOrbitsVisibility(event.detail.value);
})

// Objects

bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    const { name, value } = event.detail;
    setObjectVisibility(name, value);
});

// Font family

bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setFontFamily(event.detail.font);
});

// Text size

bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setFontSize(event.detail.textSize);
});

// Dark mode

bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, () => {
    toggleSimulationDarkMode();
});
