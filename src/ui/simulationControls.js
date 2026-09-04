import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import {
  simulationSpeed,
  simulationSpeedUnit,
  habitableZoneShown,
  orbitsShown,
  referenceGridShown,
  labelsShown,
  hiddenObjects,
} from "../shared/simulationState.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

// PLAY/PAUSE BUTTON

const playIcon = document.querySelector("#play-icon");
const pauseIcon = document.querySelector("#pause-icon");

// TODO: consider making events sim start/stop just a toggle thing
bus.subscribe(EVENTS.SIM.START, () => {
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
});

bus.subscribe(EVENTS.SIM.STOP, () => {
    playIcon.classList.remove("hidden");
    pauseIcon.classList.add("hidden");
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
})


const viewSettingsValues = {
	"habitable-zone": habitableZoneShown,
	"orbits": orbitsShown,
	"reference-grid": referenceGridShown,
	"labels": labelsShown,
};

const viewSettingsToggles = document.getElementById("view-settings-toggles");

viewSettingsToggles.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
	checkbox.checked = viewSettingsValues[checkbox.dataset.setting];
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


const objectToggles = document.getElementById("objects-toggles");
const currentHiddenObjects = hiddenObjects[currentSystem]; 

objectToggles.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
	checkbox.checked = !currentHiddenObjects.includes(checkbox.dataset.object);
});

// SPEED ADJUSTER VALUES

const speedAdjuster = document.getElementById("speed-adjuster");
const speedUnitSelector = document.getElementById("speed-unit-selector");

speedAdjuster.value = simulationSpeed;
speedUnitSelector.value = simulationSpeedUnit;
