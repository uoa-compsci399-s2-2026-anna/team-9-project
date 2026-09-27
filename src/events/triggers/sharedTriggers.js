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
 * Creates a start/stop controlled repeater that invokes `callback` once
 * after an initial `delayMs` milliseconds, then repeatedly every `periodMs`
 * milliseconds until `stop()` is called.
 * 
 * @param {() => void} callback The function to invoke after the delay and then on each repeat
 * @param {number} delayMs Milliseconds to wait before the first repeat begins
 * @param {number} periodMs Milliseconds between each subsequent repeat once started
 * @returns {{ start: () => void, stop: () => void }} Handlers to start or stop the repeat cycle
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
 * Binds `key` so that pressing it invokes `callback` once immediately.
 * 
 * Holding down the key repeatedly invokes the given callback.
 * Repeating starts after `data-repeat-delay-ms`, then continues every
 * `data-repeat-period-ms` until the pointer is released.
 * 
 * @param {string} key The `KeyboardEvent.key` value that triggers the shortcut
 * @param {() => void} callback The callback to invoke on keydown and on each repeat
 * @param {{ delayMs: number, periodMs: number }} options Timing for the hold-repeat (see {@link createRepeater})
 */
function attachKeyHoldRepeat(key, callback, { delayMs, periodMs }) {
    const { start, stop } = createRepeater(callback, delayMs, periodMs);

    document.addEventListener("keydown", (event) => {
        if (event.key !== key || event.repeat || isTypingTarget(document.activeElement)) {
            return;
        }

        event.preventDefault();

        callback();
        start();
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === key) {
            stop();
        }
    });
}

/**
 * Binds `key` so that pressing it invokes `callback` once.
 * 
 * @param {string} key The `KeyboardEvent.key` value that triggers the callback
 * @param {() => void} callback The callback to invoke on keydown
 */
function attachKeyPress(key, callback) {
    document.addEventListener("keydown", (event) => {
        // Ignore repeat events fired by the OS and ignore key presses when typing
        if (event.key !== key || event.repeat || isTypingTarget(document.activeElement)) {
            return;
        }

        event.preventDefault();

        callback();
    });
}

/**
 * Whether the given button type element allows holding to repeat.
 * 
 * @param {HTMLElement} buttonType The `[data-button-type]` element to check
 * @returns {boolean} Whether `buttonType` allows holding to repeat
 */
function allowsRepeat(buttonType) {
    return buttonType.dataset.allowRepeat.toLowerCase() === "true";
}

/**
 * Whether `element` is an element where keyboard input should be treated as
 * ordinary typing instead of as a keyboard shortcut.
 *
 * @param {Element | null} element The element to check
 * @returns {boolean} Whether the user is trying to type or not
 */
function isTypingTarget(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return !element.readOnly && !element.disabled;
    }
    return element?.isContentEditable ?? false;
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
        // Assume each event (relevant to shortcuts) only has one button firing it 
        buttonsByEvent.set(event, buttonType);
    }
});

/**
 * Get the associated button for each keyboard shortcut (according to its button)
 * and replicate the shortcut's associated button's hold-repeat behaviour.
 */
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
