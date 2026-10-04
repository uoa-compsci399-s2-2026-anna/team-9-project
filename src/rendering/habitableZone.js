import * as THREE from "three";
import { simulationState } from "../shared/simulationState.js";

export let habitableZone = {
    // Data will be set when the simulation is initialised
    start: null,
    end: null,
};

const HABITABLE_ZONE_SEGMENTS = 64; // Number of segments to approximate the ring
const HABITABLE_ZONE_COLOR = "#00ff00"; // Green
const HABITABLE_ZONE_OPACITY = 0.2;
const HABITABLE_ZONE_TEXTURE_SIZE = 2048; // Size in pixels

export let habitableZoneMesh;

function createHabitableZoneTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = HABITABLE_ZONE_TEXTURE_SIZE;
    canvas.height = HABITABLE_ZONE_TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = HABITABLE_ZONE_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.font = "bold 100px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Habitable zone", canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

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
    const texture = createHabitableZoneTexture();
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        opacity: HABITABLE_ZONE_OPACITY,
        transparent: true,
        side: THREE.DoubleSide,

        // Do not update depth buffer (to prevent z-fighting with other meshes)
        depthWrite: false,
    });
    habitableZoneMesh = new THREE.Mesh(geometry, material);
    habitableZoneMesh.visible = simulationState.habitableZoneShown;
}
