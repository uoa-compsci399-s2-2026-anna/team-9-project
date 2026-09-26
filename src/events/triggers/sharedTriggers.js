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
 * TODO
 * @param {*} callback 
 * @param {*} delayMs 
 * @param {*} periodMs 
 * @returns 
 */
function createRepeater(callback, delayMs, periodMs) {
    let repeatIntervalId = null;
    let repeatDelayTimeoutId = null;

    function start() {
        // Prevent registering duplicate timers
        if (repeatIntervalId !== null || repeatDelayTimeoutId !== null) {
            return;
        }

        // Wait delayMs milliseconds...
        repeatDelayTimeoutId = setTimeout(() => {
            // Then reset timeout timer
            repeatDelayTimeoutId = null;

            // Start interval (repeating) timer repeating every periodMs milliseconds
            repeatIntervalId = setInterval(callback, periodMs);
        }, delayMs);
    }

    function stop() {
        if (repeatDelayTimeoutId !== null) {
            clearTimeout(repeatDelayTimeoutId);
            repeatDelayTimeoutId = null;
        }

        if (repeatIntervalId !== null) {
            clearInterval(repeatIntervalId);
            repeatIntervalId = null;
        }
    }

    return { start, stop };
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

    const buttonType = button.closest("[data-button-type]");

    const repeatDelayMs = parseInt(buttonType.dataset.repeatDelayMs);
    const repeatPeriodMs = parseInt(buttonType.dataset.repeatPeriodMs);

    const { start, stop } = createRepeater(callback, repeatDelayMs, repeatPeriodMs);

    // Add event when pointer (mouse, touch, stylus, etc.) pressed down
    button.addEventListener("pointerdown", start);

    // Clear all timers (stop firing events) when pointerup (mouse etc.
    // released) or pointercancel ('unlikely to be any more pointer
    // events')
    document.addEventListener("pointerup", stop);
    document.addEventListener("pointercancel", stop);
}

/**
 * TODO
 * @param {*} key 
 * @param {*} callback 
 * @param {*} param2 
 */
function attachKeyHoldRepeat(key, callback, { delayMs, periodMs }) {
    const { start, stop } = createRepeater(callback, delayMs, periodMs);

    document.addEventListener("keydown", (e) => {
        if (e.key !== key || e.repeat || isTypingTarget(document.activeElement)) {
            return;
        }

        e.preventDefault();

        callback();
        start();
    });

    document.addEventListener("keyup", (e) => {
        if (e.key === key) {
            stop();
        }
    });
}

/**
 * TODO
 * @param {*} key 
 * @param {*} callback 
 */
function attachKeyPress(key, callback) {
    document.addEventListener("keydown", (e) => {
        if (e.key !== key || e.repeat || isTypingTarget(document.activeElement)) {
            return;
        }

        e.preventDefault();

        callback();
    });
}

/**
 * Whether the given button type element allows holding to repeat.
 * 
 * @param {HTMLElement} buttonType TODO
 * @returns {boolean}
 */
function allowsRepeat(buttonType) {
    return buttonType.dataset.allowRepeat.toLowerCase() === "true";
}

/**
 * Whether the given element is one where a keyboard input should be treated as typing rather than
 *  as a shortcut.
 * 
 * @param {Element | null} el
 * @returns {boolean}
 */
function isTypingTarget(el) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        // TODO: not sure about this b/c calendar
        return !el.readOnly && !el.disabled;
    }
    return el?.isContentEditable ?? false;
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

// TODO: documentation!
for (const [shortcutEvent, { key }] of Object.entries(shortcuts)) {
    const buttonType = buttonsByEvent.get(shortcutEvent);
    if (!buttonType) {
        continue;
    }

    const publish = () => bus.publish(shortcutEvent, getEventDetail(shortcutEvent));

    if (allowsRepeat(buttonType)) {
        const repeatDelayMs = parseInt(buttonType.dataset.repeatDelayMs);
        const repeatPeriodMs = parseInt(buttonType.dataset.repeatPeriodMs);
        attachKeyHoldRepeat(key, publish, { delayMs: repeatDelayMs, periodMs: repeatPeriodMs });
    } else {
        attachKeyPress(key, publish);
    }
}
