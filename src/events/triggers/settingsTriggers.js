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

// Add "change" event listeners for each option in the settings menu
document.querySelectorAll("[data-settings-option]").forEach((option) => {
    const select = option.querySelector("[data-settings-select]");
    const onChangeEvent = option.dataset.onChangeEventName;

    select.addEventListener("change", (event) => {
        bus.publish(onChangeEvent, { value: event.target.value });
    });
});
