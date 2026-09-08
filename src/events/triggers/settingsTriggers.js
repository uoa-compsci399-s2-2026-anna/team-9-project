import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Settings menu
const settingsButton = document.getElementById("settings-button");
const closeSettingsMenuButton = document.getElementById(
    "close-settings-overlay-button",
);
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

/**
 * The button in the 'Settings menu' which, when pressed, opens an overlay
 * which asks the user whether they want to confirm resetting ALL settings to
 * their defaults.
 */
const resetSettingsButton = document.getElementById("reset-settings-button");

resetSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, { openMenu: true });
});

// Confirm reset settings menu

/**
 * The confirmation button in the 'Confirm reset settings menu' which, on
 * pressed, resets all settings to system defaults.
 */
const confirmResetSettingsButton = document.getElementById(
    "confirm-reset-settings-button",
);

/**
 * The button in the 'Confirm reset settings menu' which dismisses the overlay
 * without doing anything.
 */
const cancelResetSettingsButton = document.getElementById(
    "cancel-reset-settings-button",
);

/**
 * The 'X' button in the 'Confirm reset settings menu' which dismisses the
 * overlay without doing anything.
 */
const closeConfirmResetSettingsOverlayButton = document.getElementById(
    "close-confirm-reset-settings-overlay-button",
);

confirmResetSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.CONFIRM_RESET_SETTINGS);
    bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, { openMenu: false });
});
cancelResetSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, { openMenu: false });
});
closeConfirmResetSettingsOverlayButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, { openMenu: false });
});

// Time zone
const timeZoneSelect = document.getElementById("time-zone-select");

timeZoneSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.TIME_ZONE_SELECT, {
        timeZone: event.target.value,
    });
});

// Font
const fontSelect = document.getElementById("font-select");

fontSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.FONT_SELECT, { font: event.target.value });
});

// Text size
const textSizeSelect = document.getElementById("text-size-select");

textSizeSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.TEXT_SIZE_SELECT, {
        textSize: event.target.value,
    });
});

// Object marker size
const objectMarkerSizeSelect = document.getElementById(
    "object-marker-size-select",
);

objectMarkerSizeSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.OBJECT_MARKER_SIZE_SELECT, {
        objectMarkerSize: event.target.value,
    });
});

// Orbit lines
const orbitLinesSelect = document.getElementById("orbit-lines-select");

orbitLinesSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.ORBIT_LINES_SELECT, {
        orbitLines: event.target.value,
    });
});
