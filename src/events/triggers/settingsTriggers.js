import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

document.querySelectorAll("[data-overlay]").forEach((overlay) => {
    const closeButton = overlay.querySelector("[data-close-overlay-button]");
    const toggleEventName = overlay.dataset.toggleEventName;

    // Close menu if user clicks close ('X') button
    closeButton.addEventListener("click", () => {
        bus.publish(toggleEventName, { openMenu: false });
    });

    // Close menu if user clicks outside of main panel
    overlay.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
            bus.publish(toggleEventName, { openMenu: false });
        }
    });

    console.log(overlay.dataset.buttons);

    const buttons = JSON.parse(overlay.dataset.buttons);

    for (const [buttonId, action] of Object.entries(buttons)) {
        const button = document.getElementById(buttonId);

        button.addEventListener("click", () => {
            if (action === "open") {
                bus.publish(toggleEventName, { openMenu: true });
            } else if (action === "close") {
                bus.publish(toggleEventName, { openMenu: false });
            }
        });
    }
});

// Settings menu
// const settingsButton = document.getElementById("settings-button");

// settingsButton.addEventListener("click", () => {
//     bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: true });
// });

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        // Confirm reset settings overlay must be closed before the settings window can be closed
        if (
            document.body.classList.contains(
                "confirm-reset-settings-overlay-open",
            )
        ) {
            bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, {
                openMenu: false,
            });
        } else if (document.body.classList.contains("settings-menu-open")) {
            bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: false });
        }
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

confirmResetSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.RESET_ALL_SETTINGS);
    bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, {
        openMenu: false,
    });
});

cancelResetSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, {
        openMenu: false,
    });
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
