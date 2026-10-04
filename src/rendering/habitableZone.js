import * as THREE from "three";
import { simulationState } from "../shared/simulationState.js";

export let habitableZone = {
    // Data will be set when the simulation is initialised
    start: null,
    end: null,
};

export const HABITABLE_ZONE_SEGMENTS = 64; // Number of segments to approximate the ring
export const HABITABLE_ZONE_COLOR = 0x00ff00; // Green
export const HABITABLE_ZONE_OPACITY = 0.2;

export let habitableZoneMesh;

/**
 * Create a mesh representing the habitable zone as a ring in the XY plane.
 */
export function createHabitableZoneMesh() {
    const startRadius = habitableZone.start;
    const endRadius = habitableZone.end;

    const geometry = new THREE.RingGeometry(
        startRadius,
        endRadius,
        HABITABLE_ZONE_SEGMENTS,
    );
    const material = new THREE.MeshBasicMaterial({
        color: HABITABLE_ZONE_COLOR,
        opacity: HABITABLE_ZONE_OPACITY,
        transparent: true,
        side: THREE.DoubleSide,

        // Do not update depth buffer (to prevent z-fighting with other meshes)
        depthWrite: false,
    });
    habitableZoneMesh = new THREE.Mesh(geometry, material);
    habitableZoneMesh.visible = simulationState.habitableZoneShown;
}
