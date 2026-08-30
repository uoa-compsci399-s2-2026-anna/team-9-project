import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import * as state from "../shared/simulationState.js";
import { init } from "./simulationRenderer.js";

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;
init(currentSystem)

bus.subscribe(EVENTS.SIM.START, () => {
    console.log("Started simulation");
    state.setRunning(true);
})

bus.subscribe(EVENTS.SIM.STOP, () => {
    console.log("Stopped simulation");
    state.setRunning(false);
})

bus.subscribe(EVENTS.SIM.UNFREEZE, () => {
    console.log("Unfroze simulation");
    state.setRunning(true);
})

bus.subscribe(EVENTS.SIM.FREEZE, () => {
    console.log("Froze simulation");
    state.setRunning(false);
})
