import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { convertToEpoch } from "../../utils/utils.js";
import { settings } from "../../shared/settingsState.js";
import { 
    getObjectVisibilityChanges,
    defaultSimulationState, 
    simulationState,
} from "../../shared/simulationState.js";
import { attachHoldRepeat } from "./sharedTriggers.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

// Triggers for the speed adjuster
const speedAdjuster = document.getElementById("speed-adjuster");
const speedUnitSelector = document.getElementById("speed-unit-selector");
const increaseSpeedButton = document.getElementById("increase-speed-button");
const decreaseSpeedButton = document.getElementById("decrease-speed-button");

// The simulation speed when the input is empty
const EMPTY_SPEED_VALUE = 0;

// TODO: decide where this should live (changes empty -> 0 and changes 1. -> 1)
speedAdjuster.addEventListener("change", (event) => {
    const input = event.target;

    if (input.value === "") {
        input.value = EMPTY_SPEED_VALUE;
        return;
    }

    // Truncate any trialling decimal
    input.value = parseFloat(input.value);
});

// TODO: decide where this should live (prevents the user from typing invalid or negative nums)
speedAdjuster.addEventListener("beforeinput", (event) => {
    // Allow deletions
    if (event.data == null) {
        return;
    }

    const input = event.target;

    // Get the number the user is trying to type
    const newValue = Number(
        input.value.slice(0, input.selectionStart) +
        event.data +
        input.value.slice(input.selectionEnd)
    );

    // TODO: magic value
    if (Number.isNaN(newValue) || newValue < 0) {
        event.preventDefault();
    }
});

/**
 * Parse the given simulation speed value.
 * 
 * If the value is an empty string, then the empty speed value is returned.
 * If the value is non-empty, then the value is returned as a float.
 * 
 * @param {string} value The simulation speed value as a string
 * @returns The parsed simulation speed
 */
function parseSpeedValue(value) {
    if (value === "") {
        return EMPTY_SPEED_VALUE;
    } else {
        return parseFloat(value);
    }
}

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
    // Prevent the updated speed from being negative
    const updatedSpeed = Math.max(0, currentSpeed + delta);

    speedAdjuster.value = updatedSpeed;
    publishSimulationSpeed(updatedSpeed);
}

// TODO: comment
// TODO: magic values
attachHoldRepeat(increaseSpeedButton, () => adjustSpeedBy(1));
attachHoldRepeat(decreaseSpeedButton, () => adjustSpeedBy(-1));

speedUnitSelector.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.ADJUST_SPEED_UNIT, { 
        system: currentSystem,
        unit: event.target.value 
    });
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
