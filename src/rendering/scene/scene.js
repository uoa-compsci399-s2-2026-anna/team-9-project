import * as THREE from "three";

import { createHabitableZoneMesh, habitableZoneMesh } from "./habitableZone.js";
import { createReferenceGrid, referenceGrid } from "./referenceGrid.js";
import { getTheme } from "../themes.js";

const AMBIENT_LIGHT_COLOR = 0xffffff;
const AMBIENT_LIGHT_INTENSITY = 1;

export let scene;

export const currentSystemGroup = new THREE.Group();
export const solarSystemGroup = new THREE.Group();
solarSystemGroup.visible = false; // Initially hidden until the user requests a comparison

export const objectMeshes = new Map();
export const orbitalLines = new Map();
export const objectLabels = new Map();

/**
 * Initialise the scene for the simulation renderer.
 */
export function initScene() {
    createHabitableZoneMesh();
    createReferenceGrid();

    scene = new THREE.Scene();
    scene.background = getTheme().background;
    scene.add(
        new THREE.AmbientLight(AMBIENT_LIGHT_COLOR, AMBIENT_LIGHT_INTENSITY),
    );
    scene.add(currentSystemGroup);
    scene.add(solarSystemGroup);
    scene.add(habitableZoneMesh);
    scene.add(referenceGrid);
}
