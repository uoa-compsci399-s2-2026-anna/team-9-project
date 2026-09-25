import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

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

// SYSTEMS DROPDOWN

const systemDropdown = document.getElementById("system-dropdown");
const systemDropdownWrapper = document.getElementById(
    "system-dropdown-wrapper",
);

bus.subscribe(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, (event) => {
    const { showDropdown } = event.detail;

    systemDropdownWrapper.querySelectorAll("path").forEach((path) => {
        path.classList.toggle("hidden");
    });

    if (showDropdown) {
        systemDropdown.classList.remove("grid-rows-[0fr]");
        systemDropdown.classList.add("grid-rows-[1fr]", "bordered");

        systemDropdownWrapper.classList.add(
            "bg-white",
            "outline-1",
            "outline-zinc-900",
            "dark:bg-black",
            "dark:outline-zinc-500",
            "rounded-b-none",
        );

        systemDropdownWrapper.classList.remove(
            "hover:bg-zinc-100",
            "dark:hover:bg-zinc-900",
        );
    } else {
        systemDropdown.classList.remove("grid-rows-[1fr]", "bordered");
        systemDropdown.classList.add("grid-rows-[0fr]");

        systemDropdownWrapper.classList.remove(
            "bg-white",
            "outline-1",
            "outline-zinc-900",
            "dark:bg-black",
            "dark:outline-zinc-500",
            "rounded-b-none",
        );

        systemDropdownWrapper.classList.add(
            "hover:bg-zinc-100",
            "dark:hover:bg-zinc-900",
        );
    }
});

// Panel interaction logic
document.querySelectorAll("[data-panel]").forEach((panel) => {
    const toggleEvent = panel.dataset.toggleEvent;
    const scrollContainer = panel.querySelector("[data-scroll-container]");
    const content = panel.querySelector("[data-panel-content]");

    bus.subscribe(toggleEvent, () => {
        const showHideIcon = panel.querySelector("[data-panel-show-hide-icon]");

        // Update visibility (expand/collapse)
        content.classList.toggle("grid-rows-[0fr]");
        content.classList.toggle("grid-rows-[1fr]");

        // Update open/closed icon
        showHideIcon.querySelectorAll("path").forEach((path) => {
            path.classList.toggle("hidden");
        });

        // Do not show scrollbar
        scrollContainer.classList.add("overflow-hidden");
        scrollContainer.classList.remove("overflow-y-auto");
    });

    // Do not show scrollbar
    content.addEventListener("transitionend", () => {
        const isOpen = content.classList.contains("grid-rows-[1fr]");

        if (isOpen) {
            scrollContainer.classList.add("overflow-y-auto");
            scrollContainer.classList.remove("overflow-hidden");
        }
    });
});

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
            const darkModeColour = colourIndicator.dataset.darkModeColour;
            const lightModeColour = colourIndicator.dataset.lightModeColour;

            if (enterDarkMode) {
                colourIndicator.style.backgroundColor = darkModeColour;
            } else {
                colourIndicator.style.backgroundColor = lightModeColour;
            }
        });
});
