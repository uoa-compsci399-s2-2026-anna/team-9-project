import {
  simulationSpeed,
  simulationSpeedUnit,
  habitableZoneShown,
  orbitsShown,
  referenceGridShown,
  labelsShown,
} from "../shared/simulationState.js";

// PLAY/PAUSE BUTTON

const playPauseButton = document.querySelector("#play-pause-button");
const playIcon = document.querySelector("#play-icon");
const pauseIcon = document.querySelector("#pause-icon");

playPauseButton.addEventListener("click", () => {
    playIcon.classList.toggle("hidden");
    pauseIcon.classList.toggle("hidden");
});

// VIEW SETTINGS SIDE PANEL

const viewSettingsButton = document.querySelector("#view-settings-button");
const viewSettings = document.querySelector("#view-settings");
const viewSettingsShowIcon = document.querySelector("#view-settings-show-icon");
const viewSettingsHideIcon = document.querySelector("#view-settings-hide-icon");

viewSettingsButton.addEventListener("click", () => {
    viewSettings.classList.toggle("grid-rows-[0fr]");
    viewSettings.classList.toggle("grid-rows-[1fr]");

    viewSettingsShowIcon.classList.toggle("hidden");
    viewSettingsHideIcon.classList.toggle("hidden");
});

const viewSettingsToggles = document.getElementById("view-settings-toggles");

const viewSettingsValues = {
	"habitable-zone": habitableZoneShown,
	"orbits": orbitsShown,
	"reference-grid": referenceGridShown,
	"labels": labelsShown,
};

viewSettingsToggles.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
	checkbox.checked = viewSettingsValues[checkbox.dataset.setting];
});

// OBJECTS SIDE PANEL

const objectsButton = document.querySelector("#objects-button");
const objects = document.querySelector("#objects");
const objectsShowIcon = document.querySelector("#objects-show-icon");
const objectsHideIcon = document.querySelector("#objects-hide-icon");

objectsButton.addEventListener("click", () => {
    objects.classList.toggle("grid-rows-[0fr]");
    objects.classList.toggle("grid-rows-[1fr]");

    objectsShowIcon.classList.toggle("hidden");
    objectsHideIcon.classList.toggle("hidden");
});

// SPEED ADJUSTER VALUES

const speedAdjuster = document.getElementById("speed-adjuster");
const speedUnitSelector = document.getElementById("speed-unit-selector");

speedAdjuster.value = simulationSpeed;
speedUnitSelector.value = simulationSpeedUnit;
