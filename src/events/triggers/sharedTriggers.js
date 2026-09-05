import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { darkMode } from "../../shared/settingsState.js";

// Triggers for the fullscreen button
const fullscreenButton = document.getElementById("fullscreen-button");

fullscreenButton.addEventListener("click", () => {
    bus.publish(EVENTS.TOOLBAR.FULLSCREEN_BUTTON_TOGGLE);
});

// Triggers for dark/light mode button
const darkModeToggleButton = document.getElementById("dark-mode-toggle-button");

darkModeToggleButton.addEventListener("click", () => {
    console.log(darkMode)
    bus.publish(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, { darkMode: !darkMode })
})
