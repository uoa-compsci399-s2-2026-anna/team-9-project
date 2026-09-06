import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { running } from "../../shared/simulationState.js";

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

speedAdjuster.addEventListener("input", (event) => {
    bus.publish(EVENTS.SIM.ADJUST_SPEED, { speed: event.target.value });
})

speedUnitSelector.addEventListener("change", (event) => {
    bus.publish(EVENTS.SIM.ADJUST_SPEED_UNIT, { unit: event.target.value });
})

// Triggers for step back and step forward buttons
const stepForward = document.getElementById("step-forward");
const stepBack = document.getElementById("step-back");

stepForward.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.STEP_FORWARD);
})

stepBack.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.STEP_BACK);
})

// Trigger for resetting the simulation view
const resetView = document.getElementById("reset-view");

resetView.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.RESET_VIEW);
})

// Triggers for view settings
const viewSettingsToggles = document.getElementById("view-settings-toggles");

viewSettingsToggles.addEventListener("change", (event) => {
	if (event.target.type !== "checkbox") {
        return;
    }

	const viewSetting = event.target.dataset.setting;
	const isEnabled = event.target.checked;

	switch (viewSetting) {
		case "habitable-zone":
            bus.publish(EVENTS.SIM.HABITABLE_ZONE_TOGGLE, { value: isEnabled });
			break;
		case "orbits":
            bus.publish(EVENTS.SIM.ORBITS_TOGGLE, { value: isEnabled });
			break;
		case "reference-grid":
            bus.publish(EVENTS.SIM.REFERENCE_GRID_TOGGLE, { value: isEnabled });
			break;
		case "labels":
            bus.publish(EVENTS.SIM.LABELS_TOGGLE, { value: isEnabled });
			break;
	}
});

// Triggers for hiding/showing objects
const objectsToggles = document.getElementById("objects-toggles");

objectsToggles.addEventListener("change", (event) => {
	if (event.target.type !== "checkbox") {
        return;
    }

	const objectName = event.target.dataset.object;
	const isEnabled = event.target.checked;

    bus.publish(EVENTS.SIM.OBJECT_TOGGLE, { system: currentSystem, name: objectName, value: isEnabled });
});

// View settings panel
const viewSettingsButton = document.getElementById("view-settings-button");

viewSettingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.VIEW_SETTINGS_PANEL_TOGGLE);
});

// Objects panel
const objectsButton = document.getElementById("objects-button");

objectsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.OBJECTS_PANEL_TOGGLE);
})

// System dropdown (e.g., for changing between Solar System and Kepler-16 on the simulation page)
const systemButton = document.getElementById("system-information-button");
const systemDropdown = document.getElementById("system-dropdown");

systemButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, { 
        showDropdown: systemDropdown.style.display === "none" 
    });
});
