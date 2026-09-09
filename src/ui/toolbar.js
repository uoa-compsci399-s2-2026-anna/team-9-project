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

// Fullscreen button

const fullscreenSvgPath = document.querySelector("#fullscreen-svg-path");
const fullscreenTooltip = document.querySelector("#fullscreen-tooltip");

// Initialise fullscreen icons (TBC; maybe this could be done better rather than using false as a constant?)
setFullscreenIcons(false);

function setFullscreenIcons(fullscreen) {
    if (fullscreen) {
        fullscreenTooltip.textContent = "Exit fullscreen";

        // Exit fullscreen icon
        fullscreenSvgPath.setAttribute(
            "d",
            "M6 18H4q-.425 0-.712-.288T3 17t.288-.712T4 16h3q.425 0 .713.288T8 17v3q0 .425-.288.713T7 21t-.712-.288T6 20zm12 0v2q0 .425-.288.713T17 21t-.712-.288T16 20v-3q0-.425.288-.712T17 16h3q.425 0 .713.288T21 17t-.288.713T20 18zM6 6V4q0-.425.288-.712T7 3t.713.288T8 4v3q0 .425-.288.713T7 8H4q-.425 0-.712-.288T3 7t.288-.712T4 6zm12 0h2q.425 0 .713.288T21 7t-.288.713T20 8h-3q-.425 0-.712-.288T16 7V4q0-.425.288-.712T17 3t.713.288T18 4z",
        );
    } else {
        fullscreenTooltip.textContent = "Enter fullscreen";
        
        // Enter fullscreen icon
        fullscreenSvgPath.setAttribute(
            "d",
            "M6 14c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1H7v-2c0-.55-.45-1-1-1m0-4c.55 0 1-.45 1-1V7h2c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1m11 7h-2c-.55 0-1 .45-1 1s.45 1 1 1h3c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1s-1 .45-1 1zM14 6c0 .55.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6c0-.55-.45-1-1-1h-3c-.55 0-1 .45-1 1",
        );
    }
}

// Update the fullscreen icons when the application enters/exits fullscreen
if (window.fullscreenAPI) {
    window.fullscreenAPI.onChange(setFullscreenIcons);
}

bus.subscribe(EVENTS.TOOLBAR.FULLSCREEN_BUTTON_TOGGLE, () => {
    window.fullscreenAPI.toggle();
});
