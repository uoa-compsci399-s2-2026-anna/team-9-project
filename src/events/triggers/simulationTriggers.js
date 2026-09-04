import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { running } from "../../shared/simulationState.js";

// TODO: this is overused
const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

// Triggers for the play/pause button
const playPauseButton = document.getElementById("play-pause-button");

playPauseButton.addEventListener("click", () => {
    if (running) {
        bus.publish(EVENTS.SIM.STOP);
    } else {
        bus.publish(EVENTS.SIM.START);
    }
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

	const setting = event.target.dataset.setting;
	const isEnabled = event.target.checked;

	switch (setting) {
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

// Triggers for objects
const objectsToggles = document.getElementById("objects-toggles");

objectsToggles.addEventListener("change", (event) => {
	if (event.target.type !== "checkbox") {
        return;
    }

	const objectName = event.target.dataset.object;
	const isEnabled = event.target.checked;
    // TODO: somehow document what each event provides?
    bus.publish(EVENTS.SIM.OBJECT_TOGGLE, { system: currentSystem, name: objectName, value: isEnabled });
})

// Triggers for the freezing/unfreezing the simulation when the settings menu is opened/closed
const settingsButton = document.getElementById("settings-button");
const closeSettingsMenuButton = document.getElementById("close-settings-menu-button");
const settingsOverlay = document.getElementById("settings-overlay");

settingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.FREEZE);
});

function closeSettingsMenu() {
    bus.publish(EVENTS.SIM.UNFREEZE);
}

// TODO: This doesn't belong here

closeSettingsMenuButton.addEventListener("click", closeSettingsMenu);

settingsOverlay.addEventListener("click", (e) => {
    // Close settings menu only when the user clicks outside of the main settings menu panel
    if (e.target === e.currentTarget) {
        closeSettingsMenu();
    }
});

document.addEventListener("keydown", (e) => {
    // Close settings menu if open and user presses escape
    if (e.key === "Escape" && document.body.classList.contains("settings-menu-open")) {
        closeSettingsMenu();
    }
});
