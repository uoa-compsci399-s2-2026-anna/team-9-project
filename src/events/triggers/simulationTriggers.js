import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import {
    running,
    comparingToSolarSystem,
} from "../../shared/simulationState.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

// Triggers for the play/pause button
const playPauseButton = document.getElementById("play-pause-button");

playPauseButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.TOGGLE, { startSimulation: !running });
});

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

    // Prevent the user from typing anything but a number between 0 and 9
    const cleanedInput = input.value.replace(/[^0-9.]/g, "");
    if (cleanedInput !== input.value) {
        input.value = cleanedInput;
    }

    lastValidSpeed = cleanedInput;
    bus.publish(EVENTS.SIM.ADJUST_SPEED, { speed: cleanedInput });
});

speedUnitSelector.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.ADJUST_SPEED_UNIT, { unit: event.target.value });
});

// Trigger for comparing to the solar system
const compareToSolarSystemButton = document.getElementById(
    "compare-to-solar-system-button",
);

if (compareToSolarSystemButton) {
    // Button does not exist for the solar system itself
    compareToSolarSystemButton.addEventListener("click", () => {
        bus.publish(EVENTS.SIM.COMPARE_TO_SOLAR_SYSTEM, {
            compare: !comparingToSolarSystem,
        });
    });
}

// Triggers for view settings
const habitableZoneInput = document.getElementById("habitable-zone-input");
habitableZoneInput.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.HABITABLE_ZONE_TOGGLE, {
        value: event.target.checked,
    });
});

const orbitsInput = document.getElementById("orbits-input");
orbitsInput.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.ORBITS_TOGGLE, { value: event.target.checked });
});

const referenceGridInput = document.getElementById("reference-grid-input");
referenceGridInput.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.REFERENCE_GRID_TOGGLE, {
        value: event.target.checked,
    });
});

const labelsInput = document.getElementById("labels-input");
labelsInput.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.LABELS_TOGGLE, { value: event.target.checked });
});

// Triggers for hiding/showing objects
const objectsToggles = document.getElementById("objects-scroll-container");

objectsToggles.addEventListener("change", (event) => {
    if (event.target.type !== "checkbox") {
        return;
    }

    const objectName = event.target.dataset.object;
    const isEnabled = event.target.checked;

    bus.publish(EVENTS.SIM.OBJECT_TOGGLE, {
        system: currentSystem,
        name: objectName,
        value: isEnabled,
    });
});

// Add event listeners for buttons for each panel, which publishes the relevant
// event on trigger
document.querySelectorAll("[data-panel]").forEach((panel) => {
    const button = panel.querySelector("[data-panel-button]");

    var event;

    switch (button.id) {
        case "view-settings-button":
            event = EVENTS.SIM.VIEW_SETTINGS_PANEL_TOGGLE;
            break;
        case "objects-button":
            event = EVENTS.SIM.OBJECTS_PANEL_TOGGLE;
            break;
    }

    button.addEventListener("click", () => {
        bus.publish(event, {
            content: panel.querySelector("[data-panel-content]"),
            showIcon: panel.querySelector("[data-panel-show-icon]"),
            hideIcon: panel.querySelector("[data-panel-hide-icon]"),
        });
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
    calendar.addEventListener("change", (event) => {
        const oldValue = event.target.dataset.previousValue;

        bus.publish(EVENTS.SIM.CALENDAR_CHANGE, {
            oldValue: oldValue,
            value: event.target.value,
        });

        event.target.dataset.previousValue = calendar.value;
    });
}
