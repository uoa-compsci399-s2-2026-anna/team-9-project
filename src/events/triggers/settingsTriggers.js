import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Add event listeners for buttons in overlays
document.querySelectorAll("[data-overlay]").forEach((overlay) => {
    const closeOverlayEvent = overlay.dataset.closeOverlayEvent;

    // Close menu if user clicks outside of main panel
    overlay.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
            bus.publish(closeOverlayEvent);
        }
    });
});

// Close overlays on pressing Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        // Confirm reset settings overlay must be closed before the settings window can be closed
        if (isOverlayVisibleOpacity("confirm-reset-settings-overlay")) {
            bus.publish(EVENTS.SETTINGS.CLOSE_RESET_SETTINGS_MENU);
        } else if (isOverlayVisibleOpacity("settings-overlay")) {
            bus.publish(EVENTS.SETTINGS.CLOSE_SETTINGS_MENU);
        }
    }
});

/**
 * @param {string} overlayId The ID of the overlay
 * @returns Whether the overlay is visible or not, also taking into account its
 * opacity (i.e. an element with opacity 0 is not visible, one with 100 is
 * visible).
 */
function isOverlayVisibleOpacity(overlayId) {
    return document
        .getElementById(overlayId)
        .checkVisibility({ checkOpacity: true });
}

// Add "change" event listeners for each option in the settings menu
document.querySelectorAll("[data-settings-option]").forEach((option) => {
    const select = option.querySelector("[data-settings-select]");
    const onChangeEvent = option.dataset.onChangeEventName;

    select.addEventListener("change", (event) => {
        bus.publish(onChangeEvent, { value: event.target.value });
    });
});
