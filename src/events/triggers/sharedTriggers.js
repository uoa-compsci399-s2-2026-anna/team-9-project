import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { settings } from "../../shared/settingsState.js";
import {
    running,
    comparingToSolarSystem,
} from "../../shared/simulationState.js";

const EVENT_DETAIL = {
    [EVENTS.TOOLBAR.DARK_MODE_TOGGLE]: () => {
        return { enterDarkMode: !settings.darkMode };
    },

    [EVENTS.SIM.COMPARE_TO_SOLAR_SYSTEM]: () => {
        return { compare: !comparingToSolarSystem };
    },

    [EVENTS.SIM.TOGGLE]: () => {
        return { startSimulation: !running };
    },
};

/**
 * Register event listeners, event bus publishes, and any additional event
 * detail (where provided) to all `button_with_tooltip` and `text_button` macro
 * calls.
 */
document.querySelectorAll("[data-button-type]").forEach((buttonType) => {
    const button = buttonType.querySelector("[data-button]");
    const onClickEvents = JSON.parse(buttonType.dataset.onClickEvents);

    if (!button) {
        return;
    }

    const existingEvents = Object.values(EVENTS).flatMap((category) =>
        Object.values(category),
    );

    for (const event of onClickEvents) {
        const eventExists = existingEvents.includes(event);

        if (!eventExists) {
            console.warn(
                `Event '${event}' will not be published to event bus because it is not a recognised event in events.js (did you misspell the event?)`,
            );
            continue;
        }

        const allowRepeat =
            buttonType.dataset.allowRepeat.toLowerCase() === "true";

        if (allowRepeat) {
            // Handle repeating buttons

            let repeatIntervalId = null;
            let repeatDelayTimeoutId = null;

            /**
             * The duration to wait for while the button is pressed down before
             * repeating begins.
             */
            const repeatDelayMs = parseInt(buttonType.dataset.repeatDelayMs);

            // Add event when pointer (mouse, touch, stylus, etc.) pressed down
            button.addEventListener("pointerdown", () => {
                // Prevent registering duplicate timers
                if (
                    repeatIntervalId !== null ||
                    repeatDelayTimeoutId !== null
                ) {
                    return;
                }

                // Wait repeatDelayMs milliseconds...
                repeatDelayTimeoutId = setTimeout(() => {
                    // Then reset timeout timer
                    repeatDelayTimeoutId = null;

                    // Start interval (repeating) timer repeating every
                    // repeatPeriodMs milliseconds
                    repeatIntervalId = setInterval(() => {
                        // Publish event on each callback
                        bus.publish(event, getEventDetail());
                    }, Number(buttonType.dataset.repeatPeriodMs));
                }, repeatDelayMs);
            });

            // Clear all timers (stop firing events) when pointerup (mouse etc.
            // released) or pointercancel ('unlikely to be any more pointer
            // events')
            document.addEventListener("pointerup", resetAllTimers);
            document.addEventListener("pointercancel", resetAllTimers);

            /**
             * Resets all existing active timers.
             */
            function resetAllTimers() {
                if (repeatDelayTimeoutId !== null) {
                    clearTimeout(repeatDelayTimeoutId);
                    repeatDelayTimeoutId = null;
                }

                if (repeatIntervalId !== null) {
                    clearInterval(repeatIntervalId);
                    repeatIntervalId = null;
                }
            }
        }

        button.addEventListener("click", () => {
            bus.publish(event, getEventDetail());
        });

        function getEventDetail() {
            return EVENT_DETAIL[event] ? EVENT_DETAIL[event]() : {};
        }
    }
});
