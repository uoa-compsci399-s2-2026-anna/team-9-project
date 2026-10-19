import * as THREE from "three";

import { settings } from "../shared/settingsState.js";

const themes = {
    light: {
        background: new THREE.Color("white"),
        labelBackground: "rgba(255, 255, 255, 0.5)",
        referenceGrid: 0xcccccc,
        habitableZone: "#89f689",
        habitableZoneText: "#043204",
        comparisonOverlay: "#7d5c12",
    },
    dark: {
        background: new THREE.Color("black"),
        labelBackground: "rgba(0, 0, 0, 0.5)",
        referenceGrid: 0x555555,
        habitableZone: "#000500",
        habitableZoneText: "#388738",
        comparisonOverlay: "#c3911c",
    },
};

const fontSizes = {
    Default: "12px",
    Larger: "18px",
};

const fontFamilies = {
    Default: "Geist",
    OpenDyslexic: "OpenDyslexic",
};

export function getTheme(isDarkMode = settings.darkMode) {
    return isDarkMode ? themes.dark : themes.light;
}

export function getFontSize(size = settings.textSize) {
    return fontSizes[size] ?? fontSizes.Default;
}

export function getFontFamily(chosenFont = settings.font) {
    return fontFamilies[chosenFont] ?? fontFamilies.Default;
}

/**
 * Approximate a given opacity by blending the given colour towards the current background.
 * Used to get the colour for Line2, as Line2 doesn't correctly set the opacity for joints.
 *
 * @param {string} colour The base colour to fade
 * @param {*} opacity The desired opacity from 0 (fully background) to 1 (fully colour)
 * @param {*} [isDarkMode=settings.isDarkMode] Whether to fade against the dark or light theme background
 * @returns A new colour faded towards the background colour by (1 - opacity)
 */
export function getFadedColour(
    colour,
    opacity,
    isDarkMode = settings.darkMode,
) {
    const theme = getTheme(isDarkMode);
    const backgroundColour = theme.background;

    return new THREE.Color(colour).lerp(backgroundColour, 1 - opacity);
}
