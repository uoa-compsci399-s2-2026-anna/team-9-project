import * as THREE from "three";
import {
    simulationState,
    comparingToSolarSystem,
    isObjectHidden,
    isObjectHiddenByDefault,
} from "../../shared/simulationState.js";
import { renderer } from "../renderers.js";
import { camera } from "../cameraAndControls.js";
import {
    objectSize,
    hitboxPadding,
    objectTypes,
    innermostPeriapsis,
} from "../objectProperties.js";
import { objectMeshes, objectLabels, solarSystemGroup } from "./scene.js";
import { createObjectLabel } from "./objectLabels.js";

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

const GLOW_SIZE_MULTIPLIER = 3.5;
const SPRITE_Z_SCALE = 1.0;

// Screen space object sizing
const DESIRED_OBJECT_PIXEL_SIZE = 12;
const DESIRED_STAR_PIXEL_SIZE = 24; // Stars are bigger
const DESIRED_COMPARISON_PIXEL_SIZE = 10; // Smaller size for solar system objects

// How much larger stars are compared to other objects
const STAR_SIZE_RATIO = DESIRED_STAR_PIXEL_SIZE / DESIRED_OBJECT_PIXEL_SIZE;

const MIN_SCREEN_SPACE_SCALE = 0.5;

// Keeps stars proportionally larger than other objects at the minimum scale
const MIN_STAR_SCREEN_SPACE_SCALE = MIN_SCREEN_SPACE_SCALE * STAR_SIZE_RATIO;

// Fraction of the innermost periapsis that an object's on screen radius may occupy
const MAX_EXTENT_ORBIT_FRACTION = 0.5;

const COMPARISON_LABEL_OPACITY = 0.8;

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
 * The largest scale an object may have so that its on screen radius stays
 * within a fraction of the innermost periapsis.
 *
 * @param {boolean} isStar Whether the object is a star or not
 * @returns The cap on the scale for an object
 */
function getOrbitScaleCap(isStar) {
    // The maximum size for a star
    const starSizeCap =
        (innermostPeriapsis * MAX_EXTENT_ORBIT_FRACTION) / objectSize;

    // Objects should always be STAR_SIZE_RATIO smaller than stars
    return isStar ? starSizeCap : starSizeCap / STAR_SIZE_RATIO;
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
function calculateScreenSpaceScale(
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

export function updateScreenSpaceScales() {
    const canvasHeight = renderer.domElement.clientHeight;

    for (const mesh of objectMeshes.values()) {
        if (!mesh.visible) continue;

        const isComparisonOverlay = mesh.parent === solarSystemGroup;
        const isStar = objectTypes[mesh.userData.name] === "star";

        let desiredPixelSize = DESIRED_OBJECT_PIXEL_SIZE;
        if (isStar) {
            desiredPixelSize = DESIRED_STAR_PIXEL_SIZE;
        } else if (isComparisonOverlay) {
            desiredPixelSize = DESIRED_COMPARISON_PIXEL_SIZE;
        }

        const minScale = isStar
            ? MIN_STAR_SCREEN_SPACE_SCALE
            : MIN_SCREEN_SPACE_SCALE;
        // Ensure the max scale is at least the min scale
        const maxScale = Math.max(getOrbitScaleCap(isStar), minScale);

        const scale = calculateScreenSpaceScale(
            mesh,
            canvasHeight,
            desiredPixelSize,
            minScale,
            maxScale,
        );

        mesh.scale.set(scale, scale, scale);
    }
}

/**
 * If the target object does not exist, then its mesh is created at the given position.
 * If the target object does exist, then its position is updated.
 *
 * @param {string} currentSystem Name of the current system
 * @param {string} name Name of the object
 * @param {Object} position Position of the object
 * @param {THREE.Group} group The group to add the object to
 * @param {string} colour CSS colour string used for this object's label
 */
export function createOrUpdateObjectMesh(
    currentSystem,
    name,
    position,
    group,
    colour,
) {
    // Don't create object mesh in the comparison overlay
    // for objects that are hidden by default in the Solar System
    if (
        comparingToSolarSystem &&
        group === solarSystemGroup &&
        isObjectHiddenByDefault("Solar System", name)
    ) {
        return;
    }

    let mesh = objectMeshes.get(name);

    if (!mesh) {
        const geometry = new THREE.SphereGeometry(objectSize);
        const material = new THREE.MeshBasicMaterial({ color: colour });

        mesh = new THREE.Mesh(geometry, material);

        const objectType = objectTypes[name];
        if (objectType === "star") {
            const glowTexture = createGlowTexture(colour);

            const spriteMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                transparent: true,
                depthWrite: false,
            });

            const glowSprite = new THREE.Sprite(spriteMaterial);

            const glowSize = objectSize * GLOW_SIZE_MULTIPLIER;
            glowSprite.scale.set(glowSize, glowSize, SPRITE_Z_SCALE);

            mesh.add(glowSprite);
        }

        if (group === solarSystemGroup) {
            mesh.visible = comparingToSolarSystem;
        } else {
            mesh.visible = !isObjectHidden(currentSystem, name);
        }

        // Give the mesh a name to identify the mesh with raycasting
        mesh.userData.name = name;

        // Create a larger invisible sphere for click detection
        const hitboxSize = objectSize + hitboxPadding;
        const hitboxGeometry = new THREE.SphereGeometry(hitboxSize);
        const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });

        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);

        // Add the hitbox as a child of the mesh
        mesh.add(hitbox);

        group.add(mesh);
        objectMeshes.set(name, mesh);

        const label = createObjectLabel(
            name,
            colour,
            group === solarSystemGroup ? COMPARISON_LABEL_OPACITY : 1,
        );

        label.position.set(0, 0, 0);
        label.visible = simulationState.labelsShown;

        // 'Anchors' the label to the top-left
        label.center.set(0, 0);

        mesh.add(label);
        objectLabels.set(name, label);
    }

    mesh.position.set(position.x, position.y, position.z);
}
