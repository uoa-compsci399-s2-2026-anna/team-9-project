import { simulationState } from "../../shared/simulationState.js";
import { bus } from "../../events/eventBus.js";
import { EVENTS } from "../../events/events.js";

const stepBackButtonTooltip = document.getElementById(
    "step-back-button-tooltip",
);
const stepForwardButtonTooltip = document.getElementById(
    "step-forward-button-tooltip",
);
const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;

bus.subscribe(EVENTS.SIM.ADJUST_SPEED, updateStepButtonTooltips);
bus.subscribe(EVENTS.SIM.ADJUST_SPEED_UNIT, updateStepButtonTooltips);
bus.subscribe(EVENTS.SIM.INCREASE_SPEED, updateStepButtonTooltips);
bus.subscribe(EVENTS.SIM.DECREASE_SPEED, updateStepButtonTooltips);

updateStepButtonTooltips();

function updateStepButtonTooltips() {
    const simulationSpeed = simulationState.simulationSpeed[currentSystem];
    const simulationSpeedUnit =
        simulationState.simulationSpeedUnit[currentSystem];

    const suffix = simulationSpeed === 1 ? "" : "s";

    stepBackButtonTooltip.innerText = `−${simulationSpeed} ${simulationSpeedUnit}${suffix}`;
    stepForwardButtonTooltip.innerText = `+${simulationSpeed} ${simulationSpeedUnit}${suffix}`;
}
