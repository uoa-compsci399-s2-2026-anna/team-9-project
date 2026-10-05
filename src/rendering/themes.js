import * as THREE from "three";

import { settings } from "../shared/settingsState.js";

const themes = {
    light: {
        background: new THREE.Color("white"),
        labelBackground: "rgba(255, 255, 255, 0.5)",
        referenceGrid: 0xcccccc,
        habitableZone: "#d1fdd1",
        habitableZoneText: "#043204",
    },
    dark: {
        background: new THREE.Color("black"),
        labelBackground: "rgba(0, 0, 0, 0.5)",
        referenceGrid: 0x555555,
        habitableZone: "#000500",
        habitableZoneText: "#388738",
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

export function getFontSize(size) {
    return fontSizes[size] ?? fontSizes.Default;
}

export function getFontFamily(chosenFont) {
    return fontFamilies[chosenFont] ?? fontFamilies.Default;
}
