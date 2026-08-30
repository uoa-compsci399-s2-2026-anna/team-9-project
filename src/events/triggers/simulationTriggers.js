import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import * as state from "../../shared/simulationState.js";

// Triggers for the play/pause button
const playPauseButton = document.getElementById("play-pause-button");

playPauseButton.addEventListener("click", () => {
    if (state.running) {
        bus.publish(EVENTS.SIM_STOP);
    } else {
        bus.publish(EVENTS.SIM_START);
    }
});


// Triggers for the settings menu
const settingsButton = document.getElementById("settings-button");
const closeSettingsMenuButton = document.getElementById("close-settings-menu-button");
const settingsOverlay = document.getElementById("settings-overlay");

settingsButton.addEventListener("click", () => {
    bus.publish(EVENTS.SIM_FREEZE);
});

closeSettingsMenuButton.addEventListener("click", bus.publish(EVENTS.SIM_UNFREEZE));

settingsOverlay.addEventListener("click", (e) => {
    // Close settings menu only when the user clicks outside of the main settings menu panel
    if (e.target === e.currentTarget) {
        bus.publish(EVENTS.SIM_UNFREEZE);
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        // Close settings menu if open and user presses escape
        if (document.body.classList.contains("settings-menu-open")) {
            bus.publish(EVENTS.SIM_UNFREEZE);
        }
    }
});
