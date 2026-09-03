import { 
    font, 
    objectMarkerSize, 
    orbitLines, 
    textSize, 
    timeZone 
} from "../shared/settingsState.js";

// Time zone
const timeZoneSelect = document.getElementById("time-zone-select");
timeZoneSelect.value = timeZone;

// Font
const fontSelect = document.getElementById("font-select");
fontSelect.value = font;

// Text size
const textSizeSelect = document.getElementById("text-size-select");
textSizeSelect.value = textSize;

// Object marker size
const objectMarkerSizeSelect = document.getElementById("object-marker-size-select");
objectMarkerSizeSelect.value = objectMarkerSize;

// Orbit lines
const orbitLinesSelect = document.getElementById("orbit-lines-select");
orbitLinesSelect.value = orbitLines;
