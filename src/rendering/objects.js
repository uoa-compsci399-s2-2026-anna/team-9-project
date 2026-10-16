import { currentSystemDefaultViewRadius } from "./viewRadius.js";

const OBJECT_SIZE_MULTIPLIER = 0.002;
const HITBOX_PADDING_MULTIPLIER = 0.0005;

export let objectSize;
export let hitboxPadding;

/**
 * Set the object size and hitbox padding based on the current system's default view radius.
 */
export function setObjectSize() {
    objectSize = currentSystemDefaultViewRadius * OBJECT_SIZE_MULTIPLIER; // Set the object size
    hitboxPadding = currentSystemDefaultViewRadius * HITBOX_PADDING_MULTIPLIER; // Set the hitbox padding size
}
