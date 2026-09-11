import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { settings } from "../../shared/settingsState.js";
import {
    running,
    comparingToSolarSystem,
} from "../../shared/simulationState.js";

/**
 * Register event listeners, event bus publishes, and any additional event
 * detail (where provided) to all `button_with_tooltip` and `text_button` macro
 * calls.
 */
document.querySelectorAll("[data-button-type]").forEach((buttonType) => {
    const button = buttonType.querySelector("[data-button]");
    const onClickEventName = buttonType.dataset.onClickEventName;

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        var eventDetail;

        if (onClickEventName === EVENTS.TOOLBAR.DARK_MODE_TOGGLE) {
            eventDetail = { enterDarkMode: !settings.darkMode };
        }

        switch (onClickEventName) {
            case EVENTS.TOOLBAR.DARK_MODE_TOGGLE:
                eventDetail = { enterDarkMode: !settings.darkMode };
                break;
            case EVENTS.SIM.COMPARE_TO_SOLAR_SYSTEM:
                eventDetail = { compare: !comparingToSolarSystem };
                break;
            case EVENTS.SIM.TOGGLE:
                eventDetail = { startSimulation: !running };
                break;
            case EVENTS.SETTINGS.MENU_TOGGLE:
                eventDetail = { openMenu: true };
                break;
        }

        bus.publish(onClickEventName, eventDetail);
    });
});
