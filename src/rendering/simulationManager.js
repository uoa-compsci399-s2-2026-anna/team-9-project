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
