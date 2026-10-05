import * as THREE from "three";
import { simulationState } from "../shared/simulationState.js";
import { settings } from "../shared/settingsState.js";
import { getTheme, getFontFamily } from "./themes.js";

// Ensure required fonts are loaded before creating the habitable zone texture.
// Otherwise, the text may not render correctly on the texture.
await document.fonts.load("16px OpenDyslexic");
await document.fonts.load("16px Geist");

export let habitableZone = {
    // Data will be set when the simulation is initialised
    start: null,
    end: null,
};

const HABITABLE_ZONE_SEGMENTS = 64; // Number of segments to approximate the ring
const HABITABLE_ZONE_OPACITY = 0.8;
const HABITABLE_ZONE_TEXTURE_SIZE = 4096; // Size in pixels
const HABITABLE_ZONE_TEXT = "Habitable zone";
const HABITABLE_ZONE_TEXT_FONT_SIZE = 180;
const HABITABLE_ZONE_TEXT_FONT_WEIGHT = "bold";

export let habitableZoneMesh;

let lastCameraPositionZ = 1; // Set to positive value to avoid flipping texture initially

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

/**
 * Create a texture for the habitable zone ring with the specified color and text color.
 *
 * @param {string} colour - The color of the habitable zone ring
 * @param {string} textColour - The color of the text on the texture
 * @param {string} fontFamily - The font family to use for the text
 * @returns {THREE.Texture} The generated texture for the habitable zone
 */
function createHabitableZoneTexture(colour, textColour, fontFamily) {
    const canvas = document.createElement("canvas");
    canvas.width = HABITABLE_ZONE_TEXTURE_SIZE;
    canvas.height = HABITABLE_ZONE_TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = textColour;
    ctx.font = `${HABITABLE_ZONE_TEXT_FONT_WEIGHT} ${HABITABLE_ZONE_TEXT_FONT_SIZE}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const { x, y } = calculateHabitableZoneTextPosition();

    const angleIncrement = 4 * (Math.PI / 180);

    for (const char of HABITABLE_ZONE_TEXT) {
        ctx.translate(
            HABITABLE_ZONE_TEXTURE_SIZE / 2,
            HABITABLE_ZONE_TEXTURE_SIZE / 2,
        );
        ctx.rotate(angleIncrement);
        ctx.translate(
            -HABITABLE_ZONE_TEXTURE_SIZE / 2,
            -HABITABLE_ZONE_TEXTURE_SIZE / 2,
        );
        ctx.fillText(char, x, y);
    }

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

    const theme = getTheme();
    const texture = createHabitableZoneTexture(
        theme.habitableZone,
        theme.habitableZoneText,
        getFontFamily(settings.font),
    );

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

/**
 * Update the habitable zone texture based on the current theme and font family.
 *
 * @param {Object} theme - The current theme object containing color information.
 * @param {string} fontFamily - The font family to use for the text.
 */
export function updateHabitableZoneTexture(theme, fontFamily) {
    habitableZoneMesh.material.map?.dispose();
    habitableZoneMesh.material.map = createHabitableZoneTexture(
        theme.habitableZone,
        theme.habitableZoneText,
        fontFamily,
    );
    habitableZoneMesh.material.needsUpdate = true;
}

/**
 * Flip the habitable zone texture vertically when the camera crosses the XY plane.
 * This ensures that the text on the texture is always readable from the camera's perspective.
 *
 * @param {THREE.Vector3} cameraPosition - The current position of the camera in 3D space.
 */
export function flipHabitableZoneTexture(cameraPosition) {
    if (Math.sign(cameraPosition.z) === Math.sign(lastCameraPositionZ)) {
        return;
    }

    const texture = habitableZoneMesh.material.map;
    texture.flipY = !texture.flipY;
    texture.needsUpdate = true;
    lastCameraPositionZ = cameraPosition.z;
}
