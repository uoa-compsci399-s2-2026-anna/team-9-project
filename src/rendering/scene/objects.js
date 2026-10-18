import * as THREE from "three";
import { camera } from "../cameraAndControls.js";
import { objectSize } from "../objectProperties.js";

// Star glow texture constants

const TEXTURE_SIZE = 64;
const CENTRE = TEXTURE_SIZE / 2;
const OUTER_RADIUS = CENTRE;
const INNER_RADIUS = 0;

// Gradient stop positions, each a fraction (0 to 1) of the distance from the centre to the outer edge
const CORE_STOP = 0;
const COLOUR_STOP = 0.2;
const EDGE_STOP = 1;

// Colour of the core of the star
const CORE_COLOUR = "rgba(255, 255, 255, 1)";

/**
 * Creates a radial glow texture for use as a sprite map (e.g., for rendering stars).
 * The texture has a white core that fades into the given colour, then fades to
 * transparent at the edge.
 *
 * @param {string} colour CSS colour string which the glow fades into
 * @returns {THREE.CanvasTexture} Texture for a sprite/point material map
 */
export function createGlowTexture(colour) {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createRadialGradient(
        CENTRE,
        CENTRE,
        INNER_RADIUS,
        CENTRE,
        CENTRE,
        OUTER_RADIUS,
    );

    // White core in the inner 20% of the radius, and the star's colour for the remaining 80%
    gradient.addColorStop(CORE_STOP, CORE_COLOUR);
    gradient.addColorStop(COLOUR_STOP, colour);

    // Fade from the star's colour to transparent over the remaining 80%
    const rgb = new THREE.Color(colour);
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    const transparentColour = `rgba(${r}, ${g}, ${b}, 0)`;

    gradient.addColorStop(EDGE_STOP, transparentColour);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

/**
 * Computes a scale factor so the mesh's apparent size on screen stays roughly
 * constant regardless of camera distance.
 *
 * @param {THREE.Object3D} mesh The object mesh (its geometry radius is objectSize)
 * @param {number} canvasHeight The renderer's canvas height in pixels
 * @param {number} desiredPixelSize The target on screen diameter in pixels
 * @param {number} minScale The minimum allowed scale factor
 * @param {number} maxScale The maximum allowed scale factor
 * @returns {number} The scale factor to apply to the mesh
 */
export function calculateScreenSpaceScale(
    mesh,
    canvasHeight,
    desiredPixelSize,
    minScale,
    maxScale,
) {
    const meshWorldPosition = new THREE.Vector3();
    mesh.getWorldPosition(meshWorldPosition);
    const distance = camera.position.distanceTo(meshWorldPosition);

    const verticalFovRadians = THREE.MathUtils.degToRad(camera.fov);
    const worldHeightAtDistance =
        2 * Math.tan(verticalFovRadians / 2) * distance;
    const pixelToWorldRatio = worldHeightAtDistance / canvasHeight;

    const desiredWorldDiameter = desiredPixelSize * pixelToWorldRatio;
    const scale = desiredWorldDiameter / (2 * objectSize);

    return THREE.MathUtils.clamp(scale, minScale, maxScale);
}
