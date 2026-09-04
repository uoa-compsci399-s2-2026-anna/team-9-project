import { bus } from "../eventBus.js";
import { EVENTS } from "../events.js";

// Time zone
const timeZoneSelect = document.getElementById("time-zone-select");

timeZoneSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.TIME_ZONE_SELECT, { timeZone: event.target.value });
});

// Font
const fontSelect = document.getElementById("font-select");

fontSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.FONT_SELECT, { font: event.target.value });
});

// Text size
const textSizeSelect = document.getElementById("text-size-select");

textSizeSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.TEXT_SIZE_SELECT, { textSize: event.target.value });
});

// Object marker size
const objectMarkerSizeSelect = document.getElementById("object-marker-size-select");

objectMarkerSizeSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.OBJECT_MARKER_SIZE_SELECT, { objectMarkerSize: event.target.value });
});


// Orbit lines
const orbitLinesSelect = document.getElementById("orbit-lines-select");

orbitLinesSelect.addEventListener("change", (event) => {
    bus.publish(EVENTS.SETTINGS.ORBIT_LINES_SELECT, { orbitLines: event.target.value });
});
