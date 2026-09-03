import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { setRunning, setFrozen, setSimulationSpeedUnit } from "../shared/simulationState.js";
import { init, stepForward, stepBack, resetView } from "./simulationRenderer.js";
import { setSimulationSpeed } from "../shared/simulationState.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;
init(currentSystem);

bus.subscribe(EVENTS.SIM.START, () => {
    console.log("Started simulation");
    setRunning(true);
});

bus.subscribe(EVENTS.SIM.STOP, () => {
    console.log("Stopped simulation");
    setRunning(false);
});

bus.subscribe(EVENTS.SIM.UNFREEZE, () => {
    console.log("Unfroze simulation");
    setFrozen(false);
});

bus.subscribe(EVENTS.SIM.FREEZE, () => {
    console.log("Froze simulation");
    setFrozen(true);
});

// Speed adjuster

bus.subscribe(EVENTS.SIM.ADJUST_SPEED, (event) => {
    setSimulationSpeed(event.detail.speed);
});

bus.subscribe(EVENTS.SIM.ADJUST_SPEED_UNIT, (event) => {
    setSimulationSpeedUnit(event.detail.unit);
});

// Step forward/Step back

bus.subscribe(EVENTS.SIM.STEP_FORWARD, () => {
    stepForward();
});

bus.subscribe(EVENTS.SIM.STEP_BACK, () => {
    stepBack();
});

// Reset view

bus.subscribe(EVENTS.SIM.RESET_VIEW, () => {
    resetView();
})