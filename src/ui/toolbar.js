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
    if (isDark) {
        lightModeIcon.classList.remove("hidden");
        darkModeIcon.classList.add("hidden");
        html.setAttribute("data-theme", "dark");
    } else {
        lightModeIcon.classList.add("hidden");
        darkModeIcon.classList.remove("hidden");
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

// SYSTEMS DROPDOWN

const systemButton = document.getElementById("system-information-button");
const systemDropdown = document.getElementById("system-dropdown");

if (systemButton && systemDropdown) {
    systemButton.addEventListener("click", () => {
        if (systemDropdown.style.display === "none") {
            systemDropdown.style.display = "block";
        } else {
            systemDropdown.style.display = "none";
        }
    });
}

// SETTINGS MENU OVERLAY

const settingsButton = document.querySelector("#settings-button");
const settingsOverlay = document.querySelector("#settings-overlay");
const systemInformationButton = document.querySelector(
    "#system-information-button",
);

/**
 * Toggles the visibility of the settings menu overlay.
 */
function toggleSettingsMenu() {
    settingsOverlay.classList.toggle("opacity-0");
    settingsOverlay.classList.toggle("opacity-100");
    settingsOverlay.classList.toggle("pointer-events-none");
    document.body.classList.toggle("settings-menu-open");
}

settingsButton.addEventListener("click", toggleSettingsMenu);

const closeSettingsMenuButton = document.querySelector(
    "#close-settings-menu-button",
);

closeSettingsMenuButton.addEventListener("click", toggleSettingsMenu);

settingsOverlay.addEventListener("click", (e) => {
    // Close settings menu only when the user clicks outside of the main
    // settings menu panel
    if (e.target === e.currentTarget) {
        toggleSettingsMenu();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        // Close settings menu if open and user presses escape
        if (document.body.classList.contains("settings-menu-open")) {
            toggleSettingsMenu();
        }
    }
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

const fullscreenButton = document.querySelector("#fullscreen-button");
const enterFullscreenIcon = document.querySelector("#enter-fullscreen-icon");
const exitFullscreenIcon = document.querySelector("#exit-fullscreen-icon");

fullscreenButton.addEventListener("click", () => {
    enterFullscreenIcon.classList.toggle("hidden");
    exitFullscreenIcon.classList.toggle("hidden");

    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        if (html.requestFullscreen) {
            html.requestFullscreen();
        } else if (html.webkitRequestFullscreen) {
            // Safari
            html.webkitRequestFullscreen();
        } else if (html.msRequestFullscreen) {
            // IE11
            html.msRequestFullscreen();
        }
    }
});
