import * as THREE from "three";
import {
    calculateDefaultCameraPosition,
} from "./simulationCalculations.js";

export const FOV = 45; // Field of view in degrees
export const CAMERA_NEAR_MULTIPLIER = 1;
export const CAMERA_FAR_MULTIPLIER = 100;

export const CONTROLS_MIN_MULTIPLIER = 10;
export const CONTROLS_MAX_MULTIPLIER = 1.5;
export const CONTROLS_ZOOM_SPEED = 2.5;
export const CONTROLS_MIN_ZOOM_FACTOR = 2; // The minimum factor that the controls should be able to zoom

export const CAMERA_ANIMATION_SPEED = 0.1; // Proportion of remaining distance covered per step
const CAMERA_ANIMATION_PROGRESS_THRESHOLD = 0.9999; // Animation is complete once this proportion of total distance has been covered

// Calculate the number of steps needed to reach the progress threshold.
// At the n-th step, (1 - CAMERA_ANIMATION_SPEED)^n is the remaining proportion of total distance to cover.
// So, we solve for n in the equation: (1 - CAMERA_ANIMATION_SPEED)^n = 1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD
// to get the number of steps needed for the remaining proportion of total distance to reach 1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD.
export const TOTAL_CAMERA_ANIMATION_STEPS = Math.ceil(
    Math.log(1 - CAMERA_ANIMATION_PROGRESS_THRESHOLD) / Math.log(1 - CAMERA_ANIMATION_SPEED)
);

export const cameraDefaults = {
    position: null, // Will be set based on the system's orbital data
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
    up: new THREE.Vector3(0, 0, 1), // Z-axis is up
};

export let camera; // Will be initialized in initOrUpdateCamera

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
