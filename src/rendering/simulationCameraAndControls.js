import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
    calculateCameraDistance,
    calculateDefaultCameraPosition,
} from "./simulationCalculations.js";

// Field of view (degrees) of the perspective camera we are replacing.
// No longer used by the camera itself, but kept so the default framing
// (zoom = 1 at cameraDistance) matches the old perspective view, and so
// any other module importing FOV keeps working.
export const FOV = 45;

const CAMERA_NEAR_MULTIPLIER = 1;
const CAMERA_FAR_MULTIPLIER = 100;

const CONTROLS_MIN_MULTIPLIER = 10;
const CONTROLS_MAX_MULTIPLIER = 1.5;
const CONTROLS_ZOOM_SPEED = 2.5;
const CONTROLS_MIN_ZOOM_FACTOR = 2; // The minimum factor that the controls should be able to zoom

const CAMERA_ANIMATION_SPEED = 0.1; // Proportion of remaining distance covered per step
const CAMERA_ANIMATION_PROGRESS_THRESHOLD = 0.9999; // Animation is complete once this proportion of total distance has been covered

// Calculate the number of steps needed to reach the progress threshold.
// At the n-th step, (1 - CAMERA_ANIMATION_SPEED)^n is the remaining proportion of total distance to cover.
// So, we solve for n in the equation: (1 - CAMERA_ANIMATION_SPEED)^n = 1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD
// to get the number of steps needed for the remaining proportion of total distance to reach 1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD.
const TOTAL_CAMERA_ANIMATION_STEPS = Math.ceil(
    Math.log(1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD) /
        Math.log(1 - CAMERA_ANIMATION_SPEED),
);

const ZOOM_BUTTON_FACTOR = 2; // Each zoom in/out button press multiplies/divides the zoom by this

export const cameraDefaults = {
    position: null, // Will be set based on the system's orbital data
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
    up: new THREE.Vector3(0, 0, 1), // Z-axis is up
    zoom: 1, // Zoom 1 corresponds to the default framing at cameraDistance
};

export const cameraAnimationState = {
    isAnimating: false,
    currentStep: 0,

    // The position, target and zoom to animate towards
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    zoom: 1,
};

export let camera; // Will be initialized in initOrUpdateCamera
export let controls; // Will be initialized in initOrUpdateControls

let lastControlsChangeHandler; // Store the controls change handler to remove when updating controls

// Half the visible height (in world units) at zoom = 1.
let frustumHalfHeight = 1;

/**
 * Half the visible height at the target plane for a perspective camera
 * with the old FOV at the given distance. Using this as the orthographic
 * half-height keeps the default framing identical to the old camera.
 *
 * @param {number} distance The camera distance from the target
 * @returns {number} The half-height of the view
 */
function calculateFrustumHalfHeight(distance) {
    return distance * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
}

/**
 * Update the orthographic frustum bounds from the aspect ratio.
 * @param {number} aspect The aspect ratio (width / height) of the canvas
 */
function updateFrustum(aspect) {
    camera.left = -frustumHalfHeight * aspect;
    camera.right = frustumHalfHeight * aspect;
    camera.top = frustumHalfHeight;
    camera.bottom = -frustumHalfHeight;
    camera.updateProjectionMatrix(); // Must update after changing camera parameters
}

/**
 * Update the camera frustum after the canvas has been resized.
 * Call this wherever the camera aspect ratio was previously updated.
 *
 * @param {number} aspect The new aspect ratio (width / height) of the canvas
 */
export function handleCameraResize(aspect) {
    if (!camera) return;
    updateFrustum(aspect);
}

/**
 * Calculate the camera and controls settings based on the view radius.
 *
 * @param {number} viewRadius The radius of view to fit within the camera
 * @param {number} objectSize The size of the object
 * @returns {Object} The camera and controls settings
 */
export function calculateCameraAndControlsSettings(viewRadius, objectSize) {
    const controlsMinDistance = objectSize * CONTROLS_MIN_MULTIPLIER;

    // Camera distance must be at least the minimum distance for the controls
    const epsilon = 1e-10; // Ensure the camera distance is slightly greater than controls min distance
    const cameraDistance = Math.max(
        calculateCameraDistance(FOV, viewRadius),
        controlsMinDistance + epsilon,
    );

    // Controls max distance must be at least camera distance * max multiplier,
    // and must be able to zoom by at least CONTROLS_MIN_ZOOM_FACTOR
    const controlsMaxDistance = Math.max(
        cameraDistance * CONTROLS_MAX_MULTIPLIER,
        controlsMinDistance * CONTROLS_MIN_ZOOM_FACTOR,
    );

    // OrbitControls uses zoom limits (not distance limits) for orthographic cameras.
    // Zoom 1 corresponds to cameraDistance, so the old distance limits map to:
    //   zooming out to controlsMaxDistance -> zoom = cameraDistance / controlsMaxDistance
    //   zooming in to controlsMinDistance  -> zoom = cameraDistance / controlsMinDistance
    const controlsMinZoom = cameraDistance / controlsMaxDistance;
    const controlsMaxZoom = cameraDistance / controlsMinDistance;

    const cameraNear = objectSize * CAMERA_NEAR_MULTIPLIER;
    const cameraFar = cameraDistance * CAMERA_FAR_MULTIPLIER;

    return {
        cameraDistance,
        cameraNear,
        cameraFar,
        controlsMinDistance,
        controlsMaxDistance,
        controlsMinZoom,
        controlsMaxZoom,
    };
}

/**
 * Convert a desired camera distance into the equivalent orthographic zoom.
 * Use this when animating to "focus" on something, since moving an orthographic
 * camera closer does not change the apparent size of objects.
 *
 * @param {number} cameraDistance The default camera distance (zoom = 1)
 * @param {number} desiredDistance The distance the perspective camera would have used
 * @returns {number} The zoom value that gives the same apparent size
 */
export function calculateZoomForDistance(cameraDistance, desiredDistance) {
    return cameraDistance / desiredDistance;
}

/**
 * Initialise the camera for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {Object} cameraSettings The camera settings
 * @param {number} cameraSettings.cameraDistance The distance of the camera
 * @param {number} cameraSettings.cameraNear The near plane of the camera
 * @param {number} cameraSettings.cameraFar The far plane of the camera
 */
export function initOrUpdateCamera(
    canvas,
    { cameraDistance, cameraNear, cameraFar },
) {
    cameraDefaults.position = calculateDefaultCameraPosition(
        cameraDefaults.up,
        cameraDistance,
    );
    frustumHalfHeight = calculateFrustumHalfHeight(cameraDistance);

    const aspect = canvas.clientWidth / canvas.clientHeight;

    if (!camera) {
        // Bounds are placeholders, updateFrustum sets the real values below
        camera = new THREE.OrthographicCamera(
            -1,
            1,
            1,
            -1,
            cameraNear,
            cameraFar,
        );
        camera.up.copy(cameraDefaults.up);
        camera.position.copy(cameraDefaults.position); // Set initial camera position for the current system
    } else {
        camera.near = cameraNear;
        camera.far = cameraFar;
    }

    camera.zoom = cameraDefaults.zoom; // Reset zoom, since the framing is recalculated for the current system
    updateFrustum(aspect);
}

/**
 * Initialise the controls for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {Object} controlsSettings The controls settings
 * @param {number} controlsSettings.controlsMinZoom The minimum zoom for the controls
 * @param {number} controlsSettings.controlsMaxZoom The maximum zoom for the controls
 * @param {Function} controlsChangeHandler The handler for the controls change event
 */
export function initOrUpdateControls(
    canvas,
    { controlsMinZoom, controlsMaxZoom },
    controlsChangeHandler,
) {
    if (!controls) {
        controls = new OrbitControls(camera, canvas);
        controls.addEventListener("start", () => {
            cameraAnimationState.isAnimating = false; // Stop animating on user interaction
        });

        controls.target.copy(cameraDefaults.target);
        controls.update();
    }
    controls.minZoom = controlsMinZoom;
    controls.maxZoom = controlsMaxZoom;
    controls.zoomSpeed = CONTROLS_ZOOM_SPEED;

    if (lastControlsChangeHandler) {
        controls.removeEventListener("change", lastControlsChangeHandler);
    }
    lastControlsChangeHandler = controlsChangeHandler;
    controls.addEventListener("change", controlsChangeHandler);
}

export function animateCamera() {
    if (cameraAnimationState.isAnimating) {
        // Animate the camera, controls and zoom for TOTAL_CAMERA_ANIMATION_STEPS steps.
        // Animation stops after enough steps have been taken
        // or if the user interacts with the controls.

        if (cameraAnimationState.currentStep >= TOTAL_CAMERA_ANIMATION_STEPS) {
            cameraAnimationState.isAnimating = false;
            camera.position.copy(cameraAnimationState.position);
            controls.target.copy(cameraAnimationState.target);
            camera.zoom = cameraAnimationState.zoom;
        } else {
            // Interpolate towards the desired position, target and zoom
            camera.position.lerp(
                cameraAnimationState.position,
                CAMERA_ANIMATION_SPEED,
            );
            controls.target.lerp(
                cameraAnimationState.target,
                CAMERA_ANIMATION_SPEED,
            );
            camera.zoom +=
                (cameraAnimationState.zoom - camera.zoom) *
                CAMERA_ANIMATION_SPEED;
            cameraAnimationState.currentStep++;
        }

        camera.updateProjectionMatrix(); // Must update after changing zoom
        controls.update();
    }
}

function zoomBy(factor) {
    cameraAnimationState.isAnimating = false;
    camera.zoom = THREE.MathUtils.clamp(
        camera.zoom * factor,
        controls.minZoom,
        controls.maxZoom,
    );
    camera.updateProjectionMatrix();
    controls.update();
}

export function zoomIn() {
    zoomBy(ZOOM_BUTTON_FACTOR);
}

export function zoomOut() {
    zoomBy(1 / ZOOM_BUTTON_FACTOR);
}
