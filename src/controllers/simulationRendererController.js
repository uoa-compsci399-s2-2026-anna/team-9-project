import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import {
    init,
    stepForward,
    stepBack,
    resetView,
    compareToSolarSystem,
    hideSolarSystem,
    setHabitableZoneVisibility,
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

// Compare to solar system

bus.subscribe(EVENTS.SIM.COMPARE_TO_SOLAR_SYSTEM, (event) => {
    if (event.detail.compare) {
        compareToSolarSystem();
    } else {
        hideSolarSystem();
    }
});

// View settings

bus.subscribe(EVENTS.SIM.HABITABLE_ZONE_TOGGLE, (event) => {
    setHabitableZoneVisibility(event.detail.value);
});

bus.subscribe(EVENTS.SIM.LABELS_TOGGLE, (event) => {
    setLabelsVisibility(event.detail.value);
});

bus.subscribe(EVENTS.SIM.ORBITS_TOGGLE, (event) => {
    setOrbitsVisibility(event.detail.value);
});

// Objects

bus.subscribe(EVENTS.SIM.OBJECT_TOGGLE, (event) => {
    const { name, value } = event.detail;
    setObjectVisibility(name, value);
});

// Font family

bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setFontFamily(event.detail.value);
});

// Text size

bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setFontSize(event.detail.value);
});

// Dark mode

bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    toggleSimulationDarkMode(event.detail.enterDarkMode);
});
