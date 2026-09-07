import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Settings menu
const settingsButton = document.getElementById("settings-button");
const closeSettingsMenuButton = document.getElementById("close-settings-menu-button");
const settingsOverlay = document.getElementById("settings-overlay");

settingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: true });
});

closeSettingsMenuButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: false });
});

settingsOverlay.addEventListener("click", (event) => {
    // Close settings menu only when the user clicks outside of the main settings menu panel
    if (event.target === event.currentTarget) {
            bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: false });
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        // Close settings menu if open and user presses escape
        if (document.body.classList.contains("settings-menu-open")) {
            bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: false });
        }
    }
});

// Time zone
const timeZoneSelect = document.getElementById("time-zone-select");

timeZoneSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.TIME_ZONE_SELECT, { timeZone: event.target.value });
});

// Font
const fontSelect = document.getElementById("font-select");

fontSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.FONT_SELECT, { font: event.target.value });
});

// Text size
const textSizeSelect = document.getElementById("text-size-select");

textSizeSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.TEXT_SIZE_SELECT, { textSize: event.target.value });
});

// Object marker size
const objectMarkerSizeSelect = document.getElementById("object-marker-size-select");

objectMarkerSizeSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.OBJECT_MARKER_SIZE_SELECT, { objectMarkerSize: event.target.value });
});


// Orbit lines
const orbitLinesSelect = document.getElementById("orbit-lines-select");

orbitLinesSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.ORBIT_LINES_SELECT, { orbitLines: event.target.value });
});
