import { currentSystemDefaultViewRadius } from "./viewRadius.js";

const OBJECT_SIZE_MULTIPLIER = 0.002;
const HITBOX_PADDING_MULTIPLIER = 0.0005;

export let objectSize;
export let hitboxPadding;

export let currentSystemColours;
export let objectTypes;

/**
 * Set the object size and hitbox padding based on the current system's default view radius.
 */
export function setObjectSize() {
    objectSize = currentSystemDefaultViewRadius * OBJECT_SIZE_MULTIPLIER; // Set the object size
    hitboxPadding = currentSystemDefaultViewRadius * HITBOX_PADDING_MULTIPLIER; // Set the hitbox padding size
}

/**
 * Get the configured colour for an object in the current system, appropriate for the
 * current light/dark theme. Falls back to black in light mode and white in dark mode if the
 * object has no configured colour, or if currentSystemColours hasn't been populated yet.
 *
 * @param {string} name Name of the object
 * @param {boolean} isDarkMode Whether to use the dark mode variant
 * @returns {string} CSS colour string
 */
export function getCurrentSystemColour(name, isDarkMode) {
    const variant = isDarkMode ? "dark" : "light";
    const fallbackColour = isDarkMode ? "white" : "black";
    return currentSystemColours?.[name]?.[variant] ?? fallbackColour;
}

/**
 * Set the colours of objects in the current system based on the provided object data.
 * @param {Object} objectData The object data containing colour information
 */
export function setCurrentSystemColours(objectData) {
    currentSystemColours = Object.fromEntries(
        Object.entries(objectData ?? {}).map(([name, data]) => [
            name,
            data.colour,
        ]),
    );
}

/**
 * Set the types of objects in the current system based on the provided object data.
 * @param {Object} objectData The object data containing type information
 */
export function setObjectTypes(objectData) {
    objectTypes = Object.fromEntries(
        Object.entries(objectData ?? {}).map(([name, data]) => [
            name,
            data.type,
        ]),
    );
}
