import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

const html = document.documentElement;

// Disable dragging for all links
document.querySelectorAll("a").forEach((a) => {
    a.setAttribute("draggable", "false");
});

// Dark/light mode
const themeTooltip = document.querySelector("#theme-tooltip");
const themeSvgPath = document.querySelector("#theme-svg-path");

// TODO: maybe this could be re-written to be better
const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
toggleDarkMode(isDarkMode);

function toggleDarkMode(isDarkMode) {
    if (isDarkMode) {
        html.setAttribute("data-theme", "dark");
        themeTooltip.textContent = "View in light mode";
        themeSvgPath.setAttribute(
            "d",
            "M11.288 4.713Q11 4.425 11 4V2q0-.425.288-.712T12 1t.713.288T13 2v2q0 .425-.288.713T12 5t-.712-.288M16.95 7.05q-.275-.275-.275-.687t.275-.713l1.4-1.425q.3-.3.712-.3t.713.3q.275.275.275.7t-.275.7L18.35 7.05q-.275.275-.7.275t-.7-.275M20 13q-.425 0-.713-.288T19 12t.288-.712T20 11h2q.425 0 .713.288T23 12t-.288.713T22 13zm-8.712 9.713Q11 22.425 11 22v-2q0-.425.288-.712T12 19t.713.288T13 20v2q0 .425-.288.713T12 23t-.712-.288M5.65 7.05l-1.425-1.4q-.3-.3-.3-.725t.3-.7q.275-.275.7-.275t.7.275L7.05 5.65q.275.275.275.7t-.275.7q-.3.275-.7.275t-.7-.275m12.7 12.725l-1.4-1.425q-.275-.3-.275-.712t.275-.688t.688-.275t.712.275l1.425 1.4q.3.275.288.7t-.288.725q-.3.3-.725.3t-.7-.3M2 13q-.425 0-.712-.288T1 12t.288-.712T2 11h2q.425 0 .713.288T5 12t-.288.713T4 13zm2.225 6.775q-.275-.275-.275-.7t.275-.7L5.65 16.95q.275-.275.687-.275t.713.275q.3.3.3.713t-.3.712l-1.4 1.4q-.3.3-.725.3t-.7-.3M7.75 16.25Q6 14.5 6 12t1.75-4.25T12 6t4.25 1.75T18 12t-1.75 4.25T12 18t-4.25-1.75",
        );
    } else {
        html.setAttribute("data-theme", "light");
        themeTooltip.textContent = "View in dark mode";
        themeSvgPath.setAttribute(
            "d",
            "M14 22q-2.075 0-3.9-.788t-3.175-2.137T4.788 15.9T4 12t.788-3.9t2.137-3.175T10.1 2.788T14 2q.875 0 1.75.175t1.675.525q.3.125.45.387t.15.538q0 .225-.088.425t-.287.35q-1.75 1.375-2.7 3.375T14 12q0 2.25.925 4.25t2.7 3.35q.2.15.288.363T18 20.4q0 .275-.15.538t-.45.387q-.8.35-1.662.513T14 22",
        );
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

// Confirm reset settings overlay

const confirmResetOverlay = document.querySelector("#confirm-reset-settings-overlay");

bus.subscribe(EVENTS.SETTINGS.RESET_SETTINGS_MENU_TOGGLE, (event) => {
    const { openMenu } = event.detail;

    confirmResetOverlay.classList.toggle("opacity-100", openMenu);
    document.body.classList.toggle(`confirm-reset-settings-overlay-open`, openMenu);

    confirmResetOverlay.classList.toggle("opacity-0", !openMenu);
    confirmResetOverlay.classList.toggle("pointer-events-none", !openMenu);
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

// Go to home page when home button pressed
bus.subscribe(EVENTS.TOOLBAR.HOME, () => {
    window.location.href = "/";
});
