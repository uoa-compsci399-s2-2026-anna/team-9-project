import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Add event listeners for buttons in overlays
document.querySelectorAll("[data-overlay]").forEach((overlay) => {
    const closeButton = overlay.querySelector("[data-close-overlay-button]");

    const closeOverlayEvent = overlay.dataset.closeOverlayEvent;

    // Close menu if user clicks close ('X') button
    closeButton.addEventListener("click", () => {
        bus.publish(closeOverlayEvent);
    });

    // Close menu if user clicks outside of main panel
    overlay.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
            bus.publish(closeOverlayEvent);
        }
    });
});

// TODO: event for confirm reset settings button (allow multiple events per button)

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
