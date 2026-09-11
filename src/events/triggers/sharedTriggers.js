import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";
import { settings } from "../../shared/settingsState.js";

document.querySelectorAll("[data-button-type]").forEach((buttonType) => {
    const button = buttonType.querySelector("[data-button]");
    const onClickEventName = buttonType.dataset.onClickEventName;
    const eventDetail = JSON.parse(buttonType.dataset.eventDetail);

    button.addEventListener("click", () => {
        bus.publish(onClickEventName, eventDetail);
    });
});

// Triggers for the fullscreen button
const fullscreenButton = document.getElementById("fullscreen-button");

fullscreenButton.addEventListener("click", () => {
    bus.publish(EVENTS.TOOLBAR.FULLSCREEN_BUTTON_TOGGLE);
});

// Triggers for dark/light mode button
const darkModeToggleButton = document.getElementById("dark-mode-toggle-button");

darkModeToggleButton.addEventListener("click", () => {
    bus.publish(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, {
        enterDarkMode: !settings.darkMode,
    });
});

// Triggers for home button
const homeButton = document.getElementById("home-button");

homeButton.addEventListener("click", () => {
    bus.publish(EVENTS.TOOLBAR.HOME);
});
