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
const themeTooltip = document.querySelector("#theme-tooltip");

function toggleDarkMode(isDarkMode) {
    darkModeIcon.classList.toggle("hidden", isDarkMode);
    lightModeIcon.classList.toggle("hidden", !isDarkMode);

    if (isDarkMode) {
        html.setAttribute("data-theme", "dark");
        themeTooltip.textContent = "View in light mode";
    } else {
        html.setAttribute("data-theme", "light");
        themeTooltip.textContent = "View in dark mode";
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

// Font select

bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    const selectedFont = event.detail.font;

    if (selectedFont == "OpenDyslexic") {
        html.classList.add("font-accessible");
    } else {
        html.classList.remove("font-accessible");
    }
});

// RESET SETTINGS BUTTON

const resetSettingsButton = document.getElementById("reset-settings-button");
const confirmResetSettingsOverlay = document.getElementById(
    "confirm-reset-settings-overlay",
);
const closeConfirmResetSettingsOverlayButton = document.getElementById(
    "close-confirm-reset-settings-overlay-button",
);

/**
 * Toggles the visibility of the settings reset confirmation overlay.
 */
function toggleConfirmResetSettingsOverlay() {
    confirmResetSettingsOverlay.classList.toggle("opacity-0");
    confirmResetSettingsOverlay.classList.toggle("opacity-100");
    confirmResetSettingsOverlay.classList.toggle("pointer-events-none");
    document.body.classList.toggle("confirm-reset-settings-overlay-open");
    console.log("toggle reset settings confirm overlay");
}

if (resetSettingsButton && confirmResetSettingsOverlay) {
    resetSettingsButton.addEventListener(
        "click",
        toggleConfirmResetSettingsOverlay,
    );
}

closeConfirmResetSettingsOverlayButton.addEventListener(
    "click",
    toggleConfirmResetSettingsOverlay,
);

// Fullscreen button

const enterFullscreenIcon = document.querySelector("#enter-fullscreen-icon");
const exitFullscreenIcon = document.querySelector("#exit-fullscreen-icon");
const fullscreenTooltip = document.querySelector("#fullscreen-tooltip");

function setFullscreenIcons(fullscreen) {
    enterFullscreenIcon.classList.toggle("hidden", fullscreen);
    exitFullscreenIcon.classList.toggle("hidden", !fullscreen);

    if (fullscreen) {
        fullscreenTooltip.textContent = "Exit fullscreen";
    } else {
        fullscreenTooltip.textContent = "Enter fullscreen";
    }
}

// Update the fullscreen icons when the application enters/exits fullscreen
if (window.fullscreenAPI) {
    window.fullscreenAPI.onChange(setFullscreenIcons);
}

bus.subscribe(EVENTS.TOOLBAR.FULLSCREEN_BUTTON_TOGGLE, () => {
    window.fullscreenAPI.toggle();
});
