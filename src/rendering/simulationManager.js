import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import * as state from "../shared/simulationState.js";

bus.subscribe(EVENTS.SIM_START, () => {
    console.log("Started simulation");
    state.setRunning(true);
})

bus.subscribe(EVENTS.SIM_STOP, () => {
    console.log("Stopped simulation");
    state.setRunning(false);
})

bus.subscribe(EVENTS.SIM_UNFREEZE, () => {
    console.log("Unfroze simulation");
    state.setRunning(true);
})

bus.subscribe(EVENTS.SIM_FREEZE, () => {
    console.log("Froze simulation");
    state.setRunning(false);
})
