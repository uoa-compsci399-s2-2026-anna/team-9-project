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
