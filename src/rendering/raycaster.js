import * as THREE from "three";

import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { addNoDragClickEventListener } from "../events/triggers/sharedTriggers.js";

import { camera } from "./cameraAndControls.js";
import { objectLabels, objectMeshes } from "./scene/scene.js";

const raycaster = new THREE.Raycaster();

/**
 * Convert a viewport position into normalised device coordinates (NDC) for the given canvas.
 * NDC range from -1 to 1 on both axes.
 *
 * @param {number} clientX The x position in viewport coordinates
 * @param {number} clientY The y position in viewport coordinates
 * @param {HTMLCanvasElement} canvas The canvas to normalise against
 * @returns {THREE.Vector2} The position in NDC
 */
function getNormalisedDeviceCoordinates(clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();

    return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
    );
}

/**
 * Finds the label at the given screen coordinates and returns the name of the object that
 * the label belongs to. If several labels overlap, then the object name corresponding to
 * the closest label to the camera is returned.
 *
 * @param {number} clientX The x position in viewport coordinates
 * @param {number} clientY The y position in viewport coordinates
 * @returns {string|null} The name of the object owning the closest label at the given
 * coordinates, or null if no labels were found at this coordinates.
 */
function getLabelNameAt(clientX, clientY) {
    let closestName = null;
    let closestDistanceSquared = Infinity;
    const labelWorldPosition = new THREE.Vector3();

    for (const [name, label] of objectLabels) {
        // Skip any labels whose objects are not visible
        const mesh = objectMeshes.get(name);
        if (!mesh.visible || !mesh.parent.visible) {
            continue;
        }

        const rect = label.element.getBoundingClientRect();
        // Check whether the given point is inside the label's bounding rectangle
        const isOverLabel =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom;

        if (!isOverLabel) {
            continue;
        }

        label.getWorldPosition(labelWorldPosition);
        const labelDistanceSquared =
            camera.position.distanceToSquared(labelWorldPosition);

        if (labelDistanceSquared < closestDistanceSquared) {
            closestDistanceSquared = labelDistanceSquared;
            closestName = name;
        }
    }

    return closestName;
}

/**
 * Determines which object in the scene is at the given coordinates (if any). Checks are made
 * in the following order and the first match is returned:
 * 1. The object's own mesh (hitboxes excluded)
 * 2. The object's HTML label
 * 3. The object's hitbox (a child of the object's mesh)
 *
 * @param {number} clientX The x position in viewport coordinates
 * @param {number} clientY The y position in viewport coordinates
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 * @returns {string|null} The name of the object at the given coordinates, or null if no
 * object was found at these coordinates.
 */
export function getObjectNameAt(clientX, clientY, canvas) {
    // The three.js raycaster expects NDC coordinates
    const mouseNdc = getNormalisedDeviceCoordinates(clientX, clientY, canvas);

    // Create a ray from the camera through the mouse's position on the screen
    raycaster.setFromCamera(mouseNdc, camera);

    // Get all the meshes for all of the visible objects in the scene
    const meshes = Array.from(objectMeshes.values()).filter(
        (mesh) => mesh.visible && mesh.parent.visible,
    );

    // Check whether the ray intersects any object meshes (excludes hitboxes)
    let meshHits = raycaster.intersectObjects(meshes, false);
    if (meshHits.length > 0) {
        // Return the name of the nearest object the ray intersected
        return meshHits[0].object.userData.name;
    }

    // Get the label name at the given coordinates (if any)
    const labelName = getLabelNameAt(clientX, clientY);
    if (labelName) {
        return labelName;
    }

    // Check whether the ray intersects any hitboxes (by checking children of objects)
    const hitboxHits = raycaster.intersectObjects(meshes, true);

    if (hitboxHits.length > 0) {
        return hitboxHits[0].object.parent.userData.name;
    }

    return null;
}

/**
 * Handles when the canvas is clicked on while the user is not moving the camera.
 * Detects if an object was clicked and, if so, fires an event to notify other components
 * that an object was clicked, and publishes an event to go to the next step
 * in the help walkthrough (if in progress).
 *
 * @param {MouseEvent} event The click event
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 * @return Whether or not an object was clicked
 */
function onCanvasClick(event, canvas) {
    // Close any open object information panel
    bus.publish(EVENTS.SIM.CLOSE_OBJECT_INFO);

    const name = getObjectNameAt(event.clientX, event.clientY, canvas);

    if (!name) {
        // Go to next help walkthrough step (does nothing if not in progress) only
        // if user did not click an object
        bus.publish(EVENTS.HELP_WALKTHROUGH.NEXT);

        return false;
    }

    bus.publish(EVENTS.SIM.OBJECT_CLICK, { objectName: name });

    return true;
}

/**
 * Register pointer listeners on the canvas for raycasting. A click is ignored if it was part
 * of a camera drag, so that moving around and orienting the scene doesn't accidentally select
 * objects on the scene.
 *
 * A threshold of DRAG_THRESHOLD px is used so that accidental minute drags don't register
 * as a click.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
export function initRaycastingEvents(canvas) {
    addNoDragClickEventListener(canvas, (event) =>
        onCanvasClick(event, canvas),
    );

    canvas.addEventListener("pointercancel", () => {
        pointerStart = null;
        hasDragged = false;
    });
}
