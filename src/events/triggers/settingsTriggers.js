import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Add event listeners for buttons in overlays
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

    // Add event listeners for user-provided buttons in the data-buttons
    // attribute
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

/**
 * The confirmation button in the 'Confirm reset settings menu' which, on
 * pressed, resets all settings to system defaults.
 */
const confirmResetSettingsButton = document.getElementById(
    "confirm-reset-settings-button",
);
confirmResetSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SETTINGS.RESET_ALL_SETTINGS);
});

// Close overlays on pressing Escape
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
