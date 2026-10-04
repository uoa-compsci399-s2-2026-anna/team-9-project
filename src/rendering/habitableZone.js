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

/**
 * Calculate the position of the habitable zone text in texture coordinates,
 * positioned at the midpoint of the habitable zone ring.
 *
 * @param {boolean} [flipY=false] Whether to flip the y-coordinate of the position
 * @returns {Object} The x and y coordinates of the label in texture space
 */
function calculateHabitableZoneTextPosition(flipY = false) {
    const startRadius = habitableZone.start;
    const endRadius = habitableZone.end;

    const habitableZoneWidth = endRadius - startRadius;
    const habitableZoneHalfWidth = habitableZoneWidth / 2;
    const x = HABITABLE_ZONE_TEXTURE_SIZE / 2;
    const y =
        (HABITABLE_ZONE_TEXTURE_SIZE * habitableZoneHalfWidth) /
        (2 * endRadius);

    if (flipY) {
        return {
            x: x,
            y: HABITABLE_ZONE_TEXTURE_SIZE - y,
        };
    }

    return { x, y };
}

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

    const { x, y } = calculateHabitableZoneTextPosition();
    const { x: flippedX, y: flippedY } =
        calculateHabitableZoneTextPosition(true);

    // Draw the text twice, once normally and once flipped

    ctx.save();
    ctx.translate(x, y);
    ctx.fillText("Habitable zone", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(flippedX, flippedY);
    ctx.rotate(Math.PI);
    ctx.fillText("Habitable zone", 0, 0);
    ctx.restore();

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
