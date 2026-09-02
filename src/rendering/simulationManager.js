import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { setRunning, setFrozen } from "../shared/simulationState.js";
import { init } from "./simulationRenderer.js";
import { simulationSpeed, setSimulationSpeed } from "../shared/simulationState.js";

console.log("HERE: " + simulationSpeed);

const canvas = document.getElementById("simulation-canvas");
const currentSystem = canvas.dataset.currentSystem;
init(currentSystem);

bus.subscribe(EVENTS.SIM.START, () => {
    console.log("Started simulation");
    setRunning(true);
})

bus.subscribe(EVENTS.SIM.STOP, () => {
    console.log("Stopped simulation");
    setRunning(false);
})

bus.subscribe(EVENTS.SIM.UNFREEZE, () => {
    console.log("Unfroze simulation");
    setFrozen(false);
})

bus.subscribe(EVENTS.SIM.FREEZE, () => {
    console.log("Froze simulation");
    setFrozen(true);
})

bus.subscribe(EVENTS.SIM.ADJUST_SPEED, (event) => {
    setSimulationSpeed(event.detail.speed)
})
