import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

const html = document.documentElement;

// Disable dragging for all links
document.querySelectorAll("a").forEach((a) => {
    a.setAttribute("draggable", "false");
});

// Dark/light mode
const darkModeIcon = document.querySelector("#dark-mode-icon");
const lightModeIcon = document.querySelector("#light-mode-icon");

function toggleDarkMode(isDarkMode) {
    darkModeIcon.classList.toggle("hidden", isDarkMode);
    lightModeIcon.classList.toggle("hidden", !isDarkMode);

    if (isDarkMode) {
        html.setAttribute("data-theme", "dark");
    } else {
        html.setAttribute("data-theme", "light");
    }
}

bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    const { enterDarkMode } = event.detail;

    toggleDarkMode(enterDarkMode);
});

// Settings menu overlay

const settingsOverlay = document.querySelector("#settings-overlay");

bus.subscribe(EVENTS.SETTINGS.MENU_TOGGLE, (event) => {
    const { openMenu } = event.detail;

    settingsOverlay.classList.toggle("opacity-100", openMenu);
    document.body.classList.toggle("settings-menu-open", openMenu);

    settingsOverlay.classList.toggle("opacity-0", !openMenu);
    settingsOverlay.classList.toggle("pointer-events-none", !openMenu);
});

const fontSelect = document.getElementById("font-select");
fontSelect.addEventListener("change", (e) => {
    const selectedFont = e.target.value;

    if (selectedFont == "OpenDyslexic") {
        html.classList.add("font-accessible");
    } else {
        html.classList.remove("font-accessible");
    }
});

// Fullscreen button

const enterFullscreenIcon = document.querySelector("#enter-fullscreen-icon");
const exitFullscreenIcon = document.querySelector("#exit-fullscreen-icon");

function setFullscreenIcons(fullScreen) {
    enterFullscreenIcon.classList.toggle("hidden", fullScreen);
    exitFullscreenIcon.classList.toggle("hidden", !fullScreen);
}

// Update the fullscreen icons when the application enters/exits fullscreen
window.fullscreenAPI.onChange(setFullscreenIcons);

bus.subscribe(EVENTS.TOOLBAR.FULLSCREEN_BUTTON_TOGGLE, () => {
    window.fullscreenAPI.toggle();
});
