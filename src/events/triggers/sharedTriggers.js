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

function getEventDetail(event) {
    return EVENT_DETAIL[event] ? EVENT_DETAIL[event]() : {};
}

/**
 * Attaches a click handler to the given button that invokes the given callback.
 * 
 * Holding down the buttton repeatedly invokes the given callback. 
 * Repeating starts after `data-repeat-delay-ms`, then continues every 
 * `data-repeat-period-ms` until the pointer is released.
 * 
 * @param {HTMLElement} button The button to attach the handlers to
 * @param {() => void} callback The callback to invoke on click and, if
 * enabled, on each repeat while the button is held down
 */
export function attachHoldRepeat(button, callback) {
    button.addEventListener("click", callback);

    let repeatIntervalId = null;
    let repeatDelayTimeoutId = null;

    const buttonType = button.closest("[data-button-type]");

    /**
     * The duration to wait for while the button is pressed down before
     * repeating begins.
     */
    const repeatDelayMs = parseInt(buttonType.dataset.repeatDelayMs);

    /**
     * The interval at which the callback repeats once repeating has begun.
     */
    const repeatPeriodMs = parseInt(buttonType.dataset.repeatPeriodMs);

    // Add event when pointer (mouse, touch, stylus, etc.) pressed down
    button.addEventListener("pointerdown", () => {
        // Prevent registering duplicate timers
        if (repeatIntervalId !== null || repeatDelayTimeoutId !== null) {
            return;
        }

        // Wait repeatDelayMs milliseconds...
        repeatDelayTimeoutId = setTimeout(() => {
            // Then reset timeout timer
            repeatDelayTimeoutId = null;

            // Start interval (repeating) timer repeating every repeatPeriodMs milliseconds
            repeatIntervalId = setInterval(callback, repeatPeriodMs);
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

/**
 * TODO
 * @param {*} buttonType 
 * @returns 
 */
function allowsRepeat(buttonType) {
    return buttonType.dataset.allowRepeat.toLowerCase() === "true";
}

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

    const allowRepeat = allowsRepeat(buttonType);

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
        const publish = () => bus.publish(event, getEventDetail(event));

        if (allowRepeat) {
            attachHoldRepeat(button, publish);
        } else {
            button.addEventListener("click", publish);
        }
    }
});

const shortcuts = JSON.parse(document.getElementById("shortcuts-data").textContent);

const buttonsByEvent = new Map();
document.querySelectorAll("[data-button-type]").forEach((buttonType) => {
    for (const event of JSON.parse(buttonType.dataset.onClickEvents)) {
        // TODO: what about when multiple buttons fire the event?
        buttonsByEvent.set(event, buttonType);
    }
});

for (const [event, { key }] of Object.entries(shortcuts)) {
    const buttonType = buttonsByEvent.get(event);
    if (!buttonType) {
        continue;
    }

    const publish = () => bus.publish(event, getEventDetail(event));

    if (allowsRepeat(buttonType)) {
        console.log("ONE")
    } else {
        console.log("TWO")
        document.addEventListener("keydown", (event) => {
            console.log(event.key)
            // TODO: There are more cases to consider (like repeating and typing)
            if (event.key !== key) {
                return;
            }
            // TODO: is this necessary?
            event.preventDefault();
            publish();
        });
    }
}
