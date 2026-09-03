import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import * as state from "../../shared/simulationState.js";

// Triggers for the play/pause button
const playPauseButton = document.getElementById("play-pause-button");

playPauseButton.addEventListener("click", () => {
    if (state.running) {
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

// Triggers for the settings menu
const settingsButton = document.getElementById("settings-button");
const closeSettingsMenuButton = document.getElementById("close-settings-menu-button");
const settingsOverlay = document.getElementById("settings-overlay");

settingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.ADJUST_SPEED);
});

function closeSettingsMenu() {
    bus.publish(EVENTS.SIM.UNFREEZE);
}

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
