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

bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    const { enterDarkMode } = event.detail;

    toggleDarkMode(enterDarkMode);
});

// Settings menu overlay

const settingsOverlay = document.querySelector("#settings-overlay");

// OVERLAY EVENT LISTENERS

/**
 * Stack keeping track of currently-open overlays
 */
const openOverlays = [];

bus.subscribe(EVENTS.SETTINGS.ESCAPE_PRESSED, (event) => {
    // Pop and hide topmost overlay
    const topOverlay = openOverlays.at(-1)?.overlay;
    if (topOverlay) {
        hideOverlay(topOverlay);
    }
});

bus.subscribe(EVENTS.SETTINGS.MENU_TOGGLE, (event) => {
    const { openMenu } = event.detail;

    if (openMenu) {
        showOverlay(settingsOverlay);
    } else {
        hideOverlay(settingsOverlay);
    }
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

bus.subscribe(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, (event) => {
    toggleConfirmResetSettingsOverlay();
});

const confirmResetSettingsOverlay = document.getElementById(
    "confirm-reset-settings-overlay",
);

/**
 * Toggles the visibility of the settings reset confirmation overlay.
 */
function toggleConfirmResetSettingsOverlay() {
    if (
        openOverlays.some(
            (item) => item.overlay === confirmResetSettingsOverlay,
        )
    ) {
        hideOverlay(confirmResetSettingsOverlay);
    } else {
        showOverlay(confirmResetSettingsOverlay);
    }
}

confirmResetSettingsOverlay.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
        hideOverlay(confirmResetSettingsOverlay);
    }
});

// Fullscreen button

const fullscreenButton = document.querySelector("#fullscreen-button");
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

// HELPER FUNCTIONS

/**
 * Shows some overlay and pushes it to the `openOverlays` stack
 * @param {HTMLElement} overlay The overlay to show
 */
function showOverlay(overlay) {
    overlay.classList.remove("opacity-0");
    overlay.classList.add("opacity-100");
    overlay.classList.remove("pointer-events-none");
    document.body.classList.add(`${overlay.id}-open`);

    if (!openOverlays.some((item) => item.overlay === overlay)) {
        openOverlays.push({ overlay });
    }

    if (document.body.classList.contains("settings-overlay-open")) {
        bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: true });
    }
}

/**
 * Pops and hides the topmost overlay on the `openOverlays` stack
 * @param {HTMLElement} overlay The overlay to hide
 */
function hideOverlay(overlay) {
    overlay.classList.add("opacity-0");
    overlay.classList.remove("opacity-100");
    overlay.classList.add("pointer-events-none");
    document.body.classList.remove(`${overlay.id}-open`);

    const index = openOverlays.findIndex((item) => item.overlay === overlay);
    if (index !== -1) {
        openOverlays.splice(index, 1);
    }

    if (!document.body.classList.contains("settings-overlay-open")) {
        bus.publish(EVENTS.SETTINGS.MENU_TOGGLE, { openMenu: false });
    }
}

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
