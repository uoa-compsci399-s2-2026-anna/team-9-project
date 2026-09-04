import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { darkMode } from "../shared/settingsState.js";

const html = document.documentElement;

// Disable dragging for all links
document.querySelectorAll("a").forEach((a) => {
    a.setAttribute("draggable", "false");
});

// DARK/LIGHT MODE
const darkModeIcon = document.querySelector("#dark-mode-icon");
const lightModeIcon = document.querySelector("#light-mode-icon");

function toggleDarkMode(isDark) {
    darkModeIcon.classList.toggle("hidden", isDark);
    lightModeIcon.classList.toggle("hidden", !isDark);

    if (isDark) {
        html.setAttribute("data-theme", "dark");
    } else {
        html.setAttribute("data-theme", "light");
    }
}

bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    const { darkMode } = event.detail;

    toggleDarkMode(darkMode);
});

// Initial toggle
// TODO: Try do this via python in the future
toggleDarkMode(darkMode);

// SETTINGS MENU OVERLAY

const settingsOverlay = document.querySelector("#settings-overlay");

// TODO: add some comments here
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

// FULLSCREEN BUTTON

const enterFullscreenIcon = document.querySelector("#enter-fullscreen-icon");
const exitFullscreenIcon = document.querySelector("#exit-fullscreen-icon");

bus.subscribe(EVENTS.TOOLBAR.FULLSCREEN_TOGGLE, (event) => {
    const { fullScreen } = event.detail;

    enterFullscreenIcon.classList.toggle("hidden", fullScreen);
    exitFullscreenIcon.classList.toggle("hidden", !fullScreen);

    // User wants to enter fullscreen
    if (fullScreen) {
        if (html.requestFullscreen) {
            html.requestFullscreen();
        } else if (html.webkitRequestFullscreen) {
            // Safari
            html.webkitRequestFullscreen();
        } else if (html.msRequestFullscreen) {
            // IE11
            html.msRequestFullscreen();
        }
    } else {
        document.exitFullscreen();
    }
});
