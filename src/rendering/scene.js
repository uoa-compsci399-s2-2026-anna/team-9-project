import * as THREE from "three";

import { createHabitableZoneMesh, habitableZoneMesh } from "./habitableZone.js";
import { createReferenceGrid, referenceGrid } from "./referenceGrid.js";
import { getTheme } from "./themes.js";

export let scene;

export const currentSystemGroup = new THREE.Group();
export const solarSystemGroup = new THREE.Group();
solarSystemGroup.visible = false; // Initially hidden until the user requests a comparison

/**
 * Initialise the scene for the simulation renderer.
 */
export function initScene() {
    createHabitableZoneMesh();
    createReferenceGrid();

    scene = new THREE.Scene();
    scene.background = getTheme().background;
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    scene.add(currentSystemGroup);
    scene.add(solarSystemGroup);
    scene.add(habitableZoneMesh);
    scene.add(referenceGrid);
}
