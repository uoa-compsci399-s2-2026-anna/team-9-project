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
