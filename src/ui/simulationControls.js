import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

// GRID SCALE TEXT

const gridScaleText = document.getElementById("grid-scale-text");

bus.subscribe(EVENTS.SIM.UPDATE_GRID_SCALE, (e) => {
    const scale = e.detail.value;

    gridScaleText.textContent = `${scale} AU/square`;
});

// PLAY/PAUSE BUTTON

const playPauseSvgPath = document.getElementById("play-pause-svg-path");
const playPauseTooltip = document.getElementById("play-pause-tooltip");

bus.subscribe(EVENTS.SIM.TOGGLE, (event) => {
    const { startSimulation } = event.detail;

    updatePlayPauseButtonAppearance(startSimulation);
});

/**
 * Updates the play/pause button tooltip and SVG icons to represent the
 * simulation playback state.
 * @param {boolean} isPlaying Whether the simulation is playing.
 */
function updatePlayPauseButtonAppearance(isPlaying) {
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

// COMPARE TO SOLAR SYSTEM BUTTON

const compareToSolarSystemButton = document.querySelector(
    "#compare-to-solar-system-button",
);

bus.subscribe(EVENTS.SIM.COMPARE_TO_SOLAR_SYSTEM, (event) => {
    if (compareToSolarSystemButton) {
        if (event.detail.compare) {
            compareToSolarSystemButton.textContent = "Hide Solar System";
        } else {
            compareToSolarSystemButton.textContent = "Compare to Solar System";
        }
    }
});

// COLOUR INDICATORS BY OBJECT CHECKBOXES
bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (e) => {
    const enterDarkMode = e.detail.enterDarkMode;

    document
        .querySelectorAll("[data-colour-indicator]")
        .forEach((colourIndicator) => {
            const darkModeColour = colourIndicator.closest(
                "[data-dark-mode-colour]",
            ).dataset.darkModeColour;
            const lightModeColour = colourIndicator.closest(
                "[data-light-mode-colour]",
            ).dataset.lightModeColour;

            if (enterDarkMode) {
                if (colourIndicator instanceof SVGElement) {
                    colourIndicator.setAttribute("fill", darkModeColour);
                } else {
                    colourIndicator.style.backgroundColor = darkModeColour;
                }
            } else {
                if (colourIndicator instanceof SVGElement) {
                    colourIndicator.setAttribute("fill", lightModeColour);
                } else {
                    colourIndicator.style.backgroundColor = lightModeColour;
                }
            }
        });
});
