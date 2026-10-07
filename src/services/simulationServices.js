import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { running } from "../shared/simulationState.js";

/**
 * Fetches the backend for star system information
 *
 * @param {string} name Star system name
 */
export async function getSystemInfo(name) {
    const params = new URLSearchParams({
        system_name: name,
    });

    const response = await fetch(`/system_info?${params}`);
    if (!response.ok) {
        throw new Error(`Failed to get system info: ${response.status}`);
    }

    return await response.json();
}

/**
 * Fetches the backend for multiple star systems' data at a specified time
 *
 * @param {Array.<string>} names Star system names
 * @param {number} t Timestamp in milliseconds since epoch
 */
export async function getMultipleSystemsData(names, t) {
    const params = new URLSearchParams({
        t: t,
    });

    // Add each member of the list to the parameters
    names.forEach((name) => params.append("system_names", name));

    // Show the loader after 1 second while running else 500 milisecond
    const waitTimeMs = running ? 1000 : 500;
    const loaderText = "Updating simulation";
    const loaderSubtext = running ? "Try a slower speed" : undefined;
    const timeoutId = setTimeout(() => {
        bus.publish(EVENTS.SHARED.SET_LOADER_VISIBLE, {
            enableLoader: true,
            loaderText: loaderText,
            loaderSubtext: loaderSubtext,
        });
    }, waitTimeMs);

    const response = await fetch(`/system?${params}`);

    // Cancel timeout callback if it has not happened
    clearTimeout(timeoutId);
    // Hide the loader regardless of whether it has been shown
    bus.publish(EVENTS.SHARED.SET_LOADER_VISIBLE, {
        enableLoader: false,
        loaderText: loaderText,
        loaderSubtext: loaderSubtext,
    });

    if (!response.ok) {
        throw new Error(`Failed to get system data: ${response.status}`);
    }

    return await response.json();
}

export async function abortCurrentIntegration() {
    await fetch("/current_integration", { method: "DELETE" });
}
