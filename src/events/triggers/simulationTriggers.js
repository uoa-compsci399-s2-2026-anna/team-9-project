import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { convertToEpoch } from "../../utils/utils.js";
import { settings } from "../../shared/settingsState.js";
import { 
    getObjectVisibilityChanges,
    defaultSimulationState, 
    simulationState,
} from "../../shared/simulationState.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

// Triggers for the speed adjuster
const speedAdjuster = document.getElementById("speed-adjuster");
const speedUnitSelector = document.getElementById("speed-unit-selector");

// Store the last valid speed input
let lastValidSpeed = speedAdjuster.value;

speedAdjuster.addEventListener("input", (event) => {
    const input = event.target;

    // Catch input that cannot be passed as a number
    if (input.validity.badInput) {
        input.value = lastValidSpeed;
        return;
    }

    // Prevent negative values
    if (parseInt(input.value) < 0) {
        input.value = 0;
    }

    // Prevent the user from typing anything but a number between 0 and 9
    const cleanedInput = input.value.replace(/[^0-9.]/g, "");
    if (cleanedInput !== input.value) {
        input.value = cleanedInput;
    }

    lastValidSpeed = cleanedInput;
    bus.publish(EVENTS.SIM.ADJUST_SPEED, { 
        system: currentSystem,
        speed: cleanedInput 
    });
});

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
