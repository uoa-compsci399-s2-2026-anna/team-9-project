import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

// PLAY/PAUSE BUTTON

const playIcon = document.querySelector("#play-icon");
const pauseIcon = document.querySelector("#pause-icon");

bus.subscribe(EVENTS.SIM.TOGGLE, (event) => {
    const { startSimulation } = event.detail;

    playIcon.classList.toggle("hidden", startSimulation);
    pauseIcon.classList.toggle("hidden", !startSimulation);
});

// SYSTEMS DROPDOWN

const systemDropdown = document.getElementById("system-dropdown");
const systemDropdownWrapper = document.getElementById(
    "system-dropdown-wrapper",
);

bus.subscribe(EVENTS.SIM.SYSTEM_DROPDOWN_TOGGLE, (event) => {
    const { showDropdown } = event.detail;

    if (showDropdown) {
        systemDropdown.classList.remove("grid-rows-[0fr]");
        systemDropdown.classList.add("grid-rows-[1fr]");

        systemDropdownWrapper.classList.add(
            "bg-white",
            "outline-1",
            "outline-zinc-900",
            "dark:bg-black",
            "dark:outline-zinc-500",
        );

        systemDropdownWrapper.classList.remove(
            "hover:bg-zinc-100",
            "dark:hover:bg-zinc-900",
        );
    } else {
        systemDropdown.classList.remove("grid-rows-[1fr]");
        systemDropdown.classList.add("grid-rows-[0fr]");

        systemDropdownWrapper.classList.remove(
            "bg-white",
            "outline-1",
            "outline-zinc-900",
            "dark:bg-black",
            "dark:outline-zinc-500",
        );

        systemDropdownWrapper.classList.add(
            "hover:bg-zinc-100",
            "dark:hover:bg-zinc-900",
        );
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
