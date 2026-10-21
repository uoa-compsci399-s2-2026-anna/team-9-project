import { getObjectNameAt } from "./raycaster.js";

// Last known pointer position (in viewport coordinates)
let pointerPosition = null;

/**
 * Track the pointer over the canvas so the cursor can be updated every frame.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
export function initHoverCursor(canvas) {
    // Store the pointer position whenever it moves over the canvas
    canvas.addEventListener("pointermove", (event) => {
        pointerPosition = { x: event.clientX, y: event.clientY };
    });
}

/**
 * Set the cursor to a pointer if an object is under the last known pointer
 * position, and to the default cursor otherwise. This is called every frame.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
export function updateHoverCursor(canvas) {
    const name =
        pointerPosition &&
        getObjectNameAt(pointerPosition.x, pointerPosition.y, canvas);

    // `name` is null if there is no object at the current pointer position
    canvas.style.cursor = name ? "pointer" : "default";
}
