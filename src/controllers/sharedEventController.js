import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

// Show/hide loader
const loaderElement = document.getElementById("loader");
const loaderTextElement = document.getElementById("loader-text");
const loaderSubtextElement = document.getElementById("loader-subtext");
bus.subscribe(EVENTS.SHARED.SET_LOADER_VISIBLE, (event) => {
    const enableLoader = event.detail.enableLoader;

    // Set loader text to the given text or the undefined text
    const loaderText = event.detail.loaderText ?? "Loading undefined";
    loaderTextElement.innerText = loaderText;

    // Set the loader subtext to the given text or empty
    const loaderSubtext = event.detail.loaderSubtext ?? "";
    loaderSubtextElement.innerText = loaderSubtext;

    if (enableLoader) {
        loaderElement.style.visibility = "visible";
    } else if (!enableLoader) {
        loaderElement.style.visibility = "hidden";
    }
});
