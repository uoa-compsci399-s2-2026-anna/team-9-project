import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { convertToEpoch } from "../../utils/utils.js";
import { settings } from "../../shared/settingsState.js";
import { 
    getObjectVisibilityChanges,
    defaultSimulationState, 
    simulationState,
    SIMULATION_SPEED_LIMITS_MS,
} from "../../shared/simulationState.js";
import { attachHoldRepeat } from "./sharedTriggers.js";
import { timeToMilliseconds, millisecondsToTime } from "../../utils/utils.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

// Triggers for the speed adjuster
const speedAdjuster = document.getElementById("speed-adjuster");
const speedUnitSelector = document.getElementById("speed-unit-selector");
const increaseSpeedButton = document.getElementById("increase-speed-button");
const decreaseSpeedButton = document.getElementById("decrease-speed-button");

// The simulation speed when the input is empty
const EMPTY_SPEED_VALUE = 0;

// Step sizes on clicking increase and decrease speed buttons
const INCREASE_SPEED_STEP = 1;
const DECREASE_SPEED_STEP = -1;

/**
 * Return whether or not the given speed (value + unit) is within the minimum
 * and maximum simulation speed.
 * 
 * @param {number} value The simulation speed (e.g., 10)
 * @param {string} unit The unit for the simulation speed (e.g., days)
 * @returns Whether or not the given speed is within the simulation speed limits
 */
function isSpeedWithinLimits(value, unit) {
    const { min, max } = SIMULATION_SPEED_LIMITS_MS;
    const ms = timeToMilliseconds(value, unit);

    return ms >= min && ms <= max;
}

/**
 * Clamps the given simulation speed (value + unit) to the limits. For example,
 * if the maximum is 100 years, and the value given is 200 years, then 100 years will
 * be returned. Similarly, if the minimum is 0 years, and the value given is -10 years,
 * then 0 years will be returned.
 * 
 * @param {number} value The simulation speed (e.g., 10)
 * @param {string} unit The unit for the simulation speed (e.g., days)
 * @returns The clamped simulation speed in milliseconds
 */
function clampSpeedToLimits(value, unit) {
    const { min, max } = SIMULATION_SPEED_LIMITS_MS;
    const valueMs = timeToMilliseconds(value, unit);
    const clampedMs = Math.min(Math.max(valueMs, min), max);

    return millisecondsToTime(clampedMs, unit);
}

/**
 * Parses a raw simulation speed value into a number.
 * 
 * An empty string is treated as EMPTY_SPEED_VALUE, since an empty value
 * represents that no speed has been set.
 * 
 * @param {string} value The raw simulation speed value as a string
 * @returns {number} The parsed simulation speed
 */
function parseSpeedValue(value) {
    if (value === "") {
        return EMPTY_SPEED_VALUE;
    } else {
        return parseFloat(value);
    }
}

/**
 * Clean up the displayed simulation speed value once the user commits their edit
 * (e.g., from pressing enter or from clicking off).
 */
speedAdjuster.addEventListener("change", (event) => {
    const input = event.target;

    input.value = parseSpeedValue(input.value);
});

/**
 * Block any input that would result in the speed adjuster input box holding
 * an invalid or negative value.
 */
speedAdjuster.addEventListener("beforeinput", (event) => {
    // Allow deletions
    if (event.data == null) {
        return;
    }

    const input = event.target;

    // Reconstruct what the field's value would be after this input
    const newValue = Number(
        input.value.slice(0, input.selectionStart) +
        event.data +
        input.value.slice(input.selectionEnd)
    );

    // Prevent the user from typing in non-numerical values
    if (Number.isNaN(newValue)) {
        event.preventDefault();
    }

    // Prevent the user from typing a value above or below the simulation speed limits
    if (!isSpeedWithinLimits(newValue, speedUnitSelector.value)) {
        event.preventDefault();
    }
});

/**
 * Publishes the given speed as the new simulation speed for the current system.
 * 
 * @param {number} speed The simulation speed to publish
 */
function publishSimulationSpeed(speed) {
    bus.publish(EVENTS.SIM.ADJUST_SPEED, { 
        system: currentSystem,
        speed: speed
    });
}

speedAdjuster.addEventListener("input", (event) => {
    let inputValue = parseSpeedValue(event.target.value);

    publishSimulationSpeed(inputValue);
});

function adjustSpeedBy(delta) {
    const currentSpeed = parseSpeedValue(speedAdjuster.value);
    const updatedSpeed = clampSpeedToLimits(currentSpeed + delta, speedUnitSelector.value);

    speedAdjuster.value = updatedSpeed;
    publishSimulationSpeed(updatedSpeed);
}

attachHoldRepeat(increaseSpeedButton, () => adjustSpeedBy(INCREASE_SPEED_STEP));
attachHoldRepeat(decreaseSpeedButton, () => adjustSpeedBy(DECREASE_SPEED_STEP));

speedUnitSelector.addEventListener("change", (event) => {
    const unit = event.target.value;
    const clampedSpeed = clampSpeedToLimits(parseSpeedValue(speedAdjuster.value), unit);

    speedAdjuster.value = clampedSpeed;

    bus.publish(EVENTS.SIM.ADJUST_SPEED_UNIT, { 
        system: currentSystem,
        unit: unit 
    });

    publishSimulationSpeed(clampedSpeed);
});

/**
 * Add event listeners for checkboxes in side panels (Objects and View settings)
 */
document
    .querySelectorAll("[data-side-panel-checkbox]")
    .forEach((sidePanelCheckbox) => {
        const toggleEvent = sidePanelCheckbox.dataset.toggleEvent;

        const objectCheckbox = sidePanelCheckbox.querySelector("[data-object]");
        const viewSettingCheckbox =
            sidePanelCheckbox.querySelector("[data-setting]");

        if (objectCheckbox) {
            // Object checkbox event listeners
            objectCheckbox.addEventListener("change", (event) => {
                const objectName = event.target.dataset.object;
                const isEnabled = event.target.checked;

                bus.publish(EVENTS.SIM.OBJECT_TOGGLE, {
                    system: currentSystem,
                    name: objectName,
                    value: isEnabled,
                });
            });
        } else if (viewSettingCheckbox) {
            // View settings event listeners
            viewSettingCheckbox.addEventListener("change", (event) => {
                bus.publish(toggleEvent, { value: event.target.checked });
            });
        }
    });

// Add event listeners for buttons for each panel, which publishes the relevant
// event on trigger
document.querySelectorAll("[data-panel]").forEach((panel) => {
    const button = panel.querySelector("[data-panel-button]");
    const toggleEvent = panel.dataset.toggleEvent;

    button.addEventListener("click", () => {
        bus.publish(toggleEvent);
    });
});

// System dropdown (e.g., for changing between Solar System and Kepler-16 on the simulation page)
const systemButton = document.getElementById("system-information-button");

let systemDropdownOpen = false;

systemButton.addEventListener("click", () => {
    systemDropdownOpen = !systemDropdownOpen;
    bus.publish(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, {
        showDropdown: systemDropdownOpen,
    });
});

// Triggers for the calendar

// There are multiple calendars (the one displayed in the standard view, and the
// one dispalayed in the narrow-screen view).
const calendars = document.getElementsByClassName("calendar");

for (const calendar of calendars) {
    calendar.addEventListener("input", (event) => {
        // Get the time since epoch in milliseconds for the given date string and the current time zone
        const epochMs = convertToEpoch(event.target.value, settings.timeZone);
        bus.publish(EVENTS.SIM.CALENDAR_CHANGE, {
            time: epochMs,
        });
    });
}

// Handle resetting object visibilities to defaults
const resetObjects = document.getElementById("reset-objects");

resetObjects.addEventListener("click", () => {
    // Get and publish the necessary object visibility changes to reset to the default state
    for (const { objectName, isShown } of getObjectVisibilityChanges(currentSystem)) {
        bus.publish(EVENTS.SIM.OBJECT_TOGGLE, { 
            system: currentSystem, 
            name: objectName, 
            value: isShown, 
        });
    }
});

// Handle resetting view settings to defaults
const VIEW_SETTING_RESET_MAP = {
    habitableZoneShown: EVENTS.SIM.HABITABLE_ZONE_TOGGLE,
    orbitsShown: EVENTS.SIM.ORBITS_TOGGLE,
    referenceGridShown: EVENTS.SIM.REFERENCE_GRID_TOGGLE,
    labelsShown: EVENTS.SIM.LABELS_TOGGLE,
};

const resetViewSettings = document.getElementById("reset-view-settings");

resetViewSettings.addEventListener("click", () => {
    for (const [stateKey, event] of Object.entries(VIEW_SETTING_RESET_MAP)) {
        const defaultValue = defaultSimulationState[stateKey];

        if (simulationState[stateKey] !== defaultValue) {
            bus.publish(event, { value: defaultValue });
        }
    }
});
