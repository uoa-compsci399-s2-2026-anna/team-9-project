import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
    calculateCameraDistance,
    calculateDefaultCameraPosition,
} from "./simulationCalculations.js";

export const FOV = 45; // Field of view in degrees

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
    Math.log(1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD) / Math.log(1 - CAMERA_ANIMATION_SPEED)
);

export const cameraDefaults = {
    position: null, // Will be set based on the system's orbital data
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
    up: new THREE.Vector3(0, 0, 1), // Z-axis is up
};

export const cameraAnimationState = {
    isAnimating: false,
    currentStep: 0,

    // The position and target to animate towards
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
};

export let camera; // Will be initialized in initOrUpdateCamera
export let controls; // Will be initialized in initOrUpdateControls

let lastControlsChangeHandler; // Store the controls change handler to remove when updating controls

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
        controlsMinDistance + epsilon
    );

    // Controls max distance must be at least camera distance * max multiplier,
    // and must be able to zoom by at least CONTROLS_MIN_ZOOM_FACTOR
    const controlsMaxDistance = Math.max(
        cameraDistance * CONTROLS_MAX_MULTIPLIER,
        controlsMinDistance * CONTROLS_MIN_ZOOM_FACTOR,
    );

    const cameraNear = objectSize * CAMERA_NEAR_MULTIPLIER;
    const cameraFar = cameraDistance * CAMERA_FAR_MULTIPLIER;

    return {
        cameraDistance,
        cameraNear,
        cameraFar,
        controlsMinDistance,
        controlsMaxDistance,
    };
}

/**
 * Initialise the camera for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {Object} cameraSettings The camera settings
 * @param {number} cameraSettings.cameraDistance The distance of the camera
 * @param {number} cameraSettings.cameraNear The near plane of the camera
 * @param {number} cameraSettings.cameraFar The far plane of the camera
 */
export function initOrUpdateCamera(canvas, { cameraDistance, cameraNear, cameraFar }) {
    cameraDefaults.position = calculateDefaultCameraPosition(
        cameraDefaults.up,
        cameraDistance,
    );

    if (!camera) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        camera = new THREE.PerspectiveCamera(
            FOV,
            aspect,
            cameraNear,
            cameraFar,
        );
        camera.up.copy(cameraDefaults.up);
        camera.position.copy(cameraDefaults.position); // Set initial camera position for the current system
    } else {
        camera.near = cameraNear;
        camera.far = cameraFar;
        camera.updateProjectionMatrix(); // Must update after changing camera parameters
    }
}

/**
 * Initialise the controls for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {Object} controlsSettings The controls settings
 * @param {number} controlsSettings.controlsMinDistance The minimum distance for the controls
 * @param {number} controlsSettings.controlsMaxDistance The maximum distance for the controls
 * @param {Function} controlsChangeHandler The handler for the controls change event
 */
export function initOrUpdateControls(
    canvas,
    { controlsMinDistance, controlsMaxDistance },
    controlsChangeHandler
) {
    if (!controls) {
        controls = new OrbitControls(camera, canvas);
        controls.addEventListener("start", () => {
            cameraAnimationState.isAnimating = false; // Stop animating on user interaction
        });

        controls.target.copy(cameraDefaults.target);
        controls.update();
    }
    controls.minDistance = controlsMinDistance;
    controls.maxDistance = controlsMaxDistance;
    controls.zoomSpeed = CONTROLS_ZOOM_SPEED;

    if (lastControlsChangeHandler) {
        controls.removeEventListener("change", lastControlsChangeHandler);
    }
    lastControlsChangeHandler = controlsChangeHandler;
    controls.addEventListener("change", controlsChangeHandler);
}

export function animateCamera() {
    if (cameraAnimationState.isAnimating) {
        // Animate the camera and controls for TOTAL_CAMERA_ANIMATION_STEPS steps.
        // Animation stops after enough steps have been taken
        // or if the user interacts with the controls.

        if (cameraAnimationState.currentStep >= TOTAL_CAMERA_ANIMATION_STEPS) {
            cameraAnimationState.isAnimating = false;
            camera.position.copy(cameraAnimationState.position);
            controls.target.copy(cameraAnimationState.target);

        } else {
            // Interpolate towards the desired position and target
            camera.position.lerp(cameraAnimationState.position, CAMERA_ANIMATION_SPEED);
            controls.target.lerp(cameraAnimationState.target, CAMERA_ANIMATION_SPEED);
            cameraAnimationState.currentStep++;
        }

        controls.update();
    }
}
