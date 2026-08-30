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


// Triggers for the settings menu
const settingsButton = document.getElementById("settings-button");
const closeSettingsMenuButton = document.getElementById("close-settings-menu-button");
const settingsOverlay = document.getElementById("settings-overlay");

settingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM.FREEZE);
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
