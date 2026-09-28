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
const systemInformationButton = document.getElementById(
    "system-information-button",
);

bus.subscribe(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, (event) => {
    const { showDropdown } = event.detail;

    systemDropdownWrapper
        .querySelector("[data-show-hide-icon]")
        .classList.toggle("-rotate-180", showDropdown);

    // TODO: Make this nicer (probably can use existing Tailwind classes e.g. clickable, etc.?)

    // Do not animate transition on open but do animate on close (the borders
    // rounding is animated on the 'closing' edge)
    systemInformationButton.classList.toggle("transition-none", showDropdown);
    systemInformationButton.classList.toggle("transition-all", !showDropdown);

    systemDropdown.classList.toggle("grid-rows-[1fr]", showDropdown);
    systemDropdown.classList.toggle("grid-rows-[0fr]", !showDropdown);

    systemDropdownWrapper.classList.toggle("bg-white", showDropdown);
    systemDropdownWrapper.classList.toggle("dark:bg-black", showDropdown);
    systemDropdownWrapper.classList.toggle("hover:bg-zinc-100", !showDropdown);
    systemDropdownWrapper.classList.toggle(
        "dark:hover:bg-zinc-900",
        !showDropdown,
    );

    if (showDropdown) {
        // Remove rounded corners from bottom so it looks consistent
        systemInformationButton.classList.add("rounded-b-none");

        systemDropdown.classList.add("bordered", "border-t-0");
    } else {
        // Add back rounded corners after transition has completed
        systemDropdown.addEventListener(
            "transitionend",
            () => {
                systemInformationButton.classList.remove(
                    "rounded-b-none",
                    "transition-all",
                );

                systemDropdown.classList.remove("bordered", "border-t-0");
            },
            { once: true },
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
        showHideIcon.classList.toggle("-rotate-90");

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
