import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

// Show/hide loader
const loaderElement = document.getElementById("loader");
const loaderTextElement = document.getElementById("loader-text");
bus.subscribe(EVENTS.SHARED.SET_LOADER_VISIBLE, (event) => {
    const enableLoader = event.detail.enableLoader;
    const loaderText = event.detail.loaderText ?? "Loading undefined";
    loaderTextElement.innerText = loaderText;
    if (enableLoader) {
        loaderElement.style.display = "flex";
    } else if (!enableLoader) {
        loaderElement.style.display = "none";
    }
});
