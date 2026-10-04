import * as THREE from "three";

import { settings } from "../shared/settingsState.js";

const themes = {
    light: {
        background: new THREE.Color("white"),
        labelBackground: "rgba(255, 255, 255, 0.5)",
        referenceGrid: 0xcccccc,
        habitableZone: "#6ae46a",
        habitableZoneText: "#002a00",
    },
    dark: {
        background: new THREE.Color("black"),
        labelBackground: "rgba(0, 0, 0, 0.5)",
        referenceGrid: 0x555555,
        habitableZone: "#033a03",
        habitableZoneText: "#afeeaf",
    },
};

const fontSizes = {
    Default: "12px",
    Larger: "18px",
};

const fontFamilies = {
    Default: "inherit",
    OpenDyslexic: "OpenDyslexic",
};

export function getTheme(isDarkMode = settings.darkMode) {
    return isDarkMode ? themes.dark : themes.light;
}

export function getFontSize(size) {
    return fontSizes[size] ?? fontSizes.Default;
}

export function getFontFamily(chosenFont) {
    return fontFamilies[chosenFont] ?? fontFamilies.Default;
}
