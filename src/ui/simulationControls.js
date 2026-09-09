import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

// PLAY/PAUSE BUTTON

const playPauseSvgPath = document.getElementById("play-pause-svg-path");
const playPauseTooltip = document.getElementById("play-pause-tooltip");

// TODO: rewrite to not use a boolean constant? 
updatePlayPauseButtonTooltipsAndIcons(false);

bus.subscribe(EVENTS.SIM.TOGGLE, (event) => {
    const { startSimulation } = event.detail;

    updatePlayPauseButtonTooltipsAndIcons(startSimulation);
});

/**
 * Updates the play/pause button tooltip and SVG icons to represent the
 * simulation playback state.
 * @param {boolean} isPlaying Whether the simulation is playing.
 */
function updatePlayPauseButtonTooltipsAndIcons(isPlaying) {
    if (isPlaying) {
        playPauseTooltip.textContent = "Pause";
        playPauseSvgPath.setAttribute(
            "d",
            "M16 19q-.825 0-1.412-.587T14 17V7q0-.825.588-1.412T16 5t1.413.588T18 7v10q0 .825-.587 1.413T16 19m-8 0q-.825 0-1.412-.587T6 17V7q0-.825.588-1.412T8 5t1.413.588T10 7v10q0 .825-.587 1.413T8 19",
        );
    } else {
        playPauseTooltip.textContent = "Play";
        playPauseSvgPath.setAttribute(
            "d",
            "M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82",
        );
    }
}

// SYSTEMS DROPDOWN

const systemDropdown = document.getElementById("system-dropdown");

bus.subscribe(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, (event) => {
    const { showDropdown } = event.detail;

    if (showDropdown) {
        systemDropdown.style.display = "block";
    } else {
        systemDropdown.style.display = "none";
    }
});

// VIEW SETTINGS SIDE PANEL

const viewSettings = document.querySelector("#view-settings");
const viewSettingsShowIcon = document.querySelector("#view-settings-show-icon");
const viewSettingsHideIcon = document.querySelector("#view-settings-hide-icon");

bus.subscribe(EVENTS.SIM.VIEW_SETTINGS_PANEL_TOGGLE, () => {
    viewSettings.classList.toggle("grid-rows-[0fr]");
    viewSettings.classList.toggle("grid-rows-[1fr]");

    viewSettingsShowIcon.classList.toggle("hidden");
    viewSettingsHideIcon.classList.toggle("hidden");
});

// OBJECTS SIDE PANEL

const objects = document.querySelector("#objects");
const objectsShowIcon = document.querySelector("#objects-show-icon");
const objectsHideIcon = document.querySelector("#objects-hide-icon");

bus.subscribe(EVENTS.SIM.OBJECTS_PANEL_TOGGLE, () => {
    objects.classList.toggle("grid-rows-[0fr]");
    objects.classList.toggle("grid-rows-[1fr]");

    objectsShowIcon.classList.toggle("hidden");
    objectsHideIcon.classList.toggle("hidden");
});
