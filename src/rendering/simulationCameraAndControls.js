import * as THREE from "three";

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
