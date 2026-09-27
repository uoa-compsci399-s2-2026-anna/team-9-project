import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
    CSS2DRenderer,
    CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { MeshLineGeometry, MeshLineMaterial } from "three.meshline";
import {
    simulationState,
    running,
    frozen,
    comparingToSolarSystem,
    isObjectHidden,
    isObjectHiddenByDefault,
    getSimulationSpeedMilliseconds,
    getSimulationTime,
    setSimulationTime,
    setFormattedSimulationDate,
    setElapsedText,
} from "../shared/simulationState.js";
import { settings } from "../shared/settingsState.js";
import {
    getSystemInfo,
    getMultipleSystemsData,
} from "../services/simulationServices.js";
import {
    calculateOrbitalPosition,
    calculateRotationMatrix,
    calculateMaxApoapsis,
    calculateCameraDistance,
    calculateAverageNormal,
    calculateDefaultCameraPosition,
    calculateCameraDistanceToTargetProjection,
    calculateReferenceGridDivisionSize,
} from "./simulationCalculations.js";
import {
    updateCalendar,
    formatSimulationDate,
    getElapsedDaysText,
} from "../ui/simulationCalendar.js";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";

let timer;

// The current simulation time in milliseconds since Unix epoch
let currentSimulationTime;

let currentSystem;

let currentSystemColours;
let objectTypes;

let scene;
let camera;
let controls;
let renderer;
let labelRenderer;

let controlsChangeHandler; // Store the controls change handler to remove when updating controls

// Stores whether the user is currently dragging the camera
let isDragging = false;

const referenceSystemData = new Map(); // Cache for orbital data at the reference timestamp

// Constants for camera and controls
const viewRadiusMultiplier = 1.3;
const objectSizeMultiplier = 0.002;
const hitboxPaddingMultiplier = 0.0005;

const fov = 45; // Field of view in degrees
const cameraNearMultiplier = 1;
const cameraFarMultiplier = 100;

const controlsMinMultiplier = 10;
const controlsMaxMultiplier = 1.5;
const controlsZoomSpeed = 2.5;
const controlsMinZoomFactor = 2; // The minimum factor that the controls should be able to zoom

const cameraDefaults = {
    position: null, // Will be set based on the system's orbital data
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
    up: new THREE.Vector3(0, 0, 1), // Z-axis is up
};

const cameraAnimationSpeed = 0.1; // Proportion of remaining distance covered per step
const cameraAnimationProgressThreshold = 0.9999; // Animation is complete once this proportion of total distance has been covered

// Calculate the number of steps needed to reach the progress threshold.
// At the n-th step, (1 - cameraAnimationSpeed)^n is the remaining proportion of total distance to cover.
// So, we solve for n in the equation: (1 - cameraAnimationSpeed)^n = 1 - cameraAnimationProgressThreshold
// to get the number of steps needed for the remaining proportion of total distance to reach 1 - cameraAnimationProgressThreshold.
const totalCameraAnimationSteps = Math.ceil(
    Math.log(1 - cameraAnimationProgressThreshold) / Math.log(1 - cameraAnimationSpeed)
);

let currentCameraAnimationStep = 0;
let animateCameraAndControls = false;

// Animation targets for camera and controls
let animateCameraPositionTo = new THREE.Vector3();
let animateControlsTargetTo = new THREE.Vector3();

const raycaster = new THREE.Raycaster();

const currentSystemGroup = new THREE.Group();
const solarSystemGroup = new THREE.Group();
solarSystemGroup.visible = false; // Initially hidden until the user requests a comparison

const objectMeshes = new Map();
const orbitalLines = new Map();
const objectLabels = new Map();

let viewRadius;

// The view radius when all objects are set to default visibility
let currentSystemDefaultViewRadius;
let solarSystemDefaultViewRadius;

// Default size and colour of all the objects
let objectSize;
let objectScale = 1;
let hitboxPadding;

const ORBIT_POINTS_COUNT = 360; // Number of points to approximate the ellipse

/**
 * The width (thickness) of the orbit lines for regular orbits and for orbits
 * belonging to the Solar System when it's shown only as a comparison overlay,
 * in screen pixels.
 */
const ORBIT_LINE_WIDTH = 20;
const COMPARISON_ORBIT_LINE_WIDTH = 10;

/**
 * Colour used for every object and orbit belonging to the Solar System when it's shown
 * only as a comparison overlay.
 */
const comparisonOverlayColour = {
    dark: "#c3911c",
    light: "#7d5c12",
};
const comparisonOrbitOpacity = 0.5;
const comparisonLabelOpacity = 0.8;

/**
 * Get the configured colour for an object in the current system, appropriate for the
 * current light/dark theme. Falls back to black in light mode and white in dark mode if the
 * object has no configured colour, or if currentSystemColours hasn't been populated yet.
 *
 * @param {string} name Name of the object
 * @param {boolean} isDarkMode Whether to use the dark mode variant
 * @returns {string} CSS colour string
 */
function getCurrentSystemColour(name, isDarkMode) {
    const variant = isDarkMode ? "dark" : "light";
    const fallbackColour = isDarkMode ? "white" : "black";
    return currentSystemColours?.[name]?.[variant] ?? fallbackColour;
}

const fontSizes = {
    Default: "12px",
    Larger: "18px",
};

const fontFamilies = {
    Default: "inherit",
    OpenDyslexic: "OpenDyslexic",
};

const themes = {
    light: {
        background: new THREE.Color("white"),
        labelBackground: "rgba(255, 255, 255, 0.5)",
        referenceGrid: 0xcccccc,
    },
    dark: {
        background: new THREE.Color("black"),
        labelBackground: "rgba(0, 0, 0, 0.5)",
        referenceGrid: 0x555555,
    },
};

const habitableZoneSegments = 64; // Number of segments to approximate the ring
const habitableZoneColor = 0x00ff00; // Green
const habitableZoneOpacity = 0.2;
let habitableZone;
let habitableZoneMesh;

// Size of the reference grid in AU when scale = 1.
// This will be scaled when the camera zoom changes.
const referenceGridSize = 1000;

const referenceGridDivisions = 1000;
const referenceGridDivisionSize = referenceGridSize / referenceGridDivisions;
const divisionsInView = 10; // Number of divisions visible when viewing the grid perpendicularly
const referenceGridOpacity = 0.5;
let referenceGrid;

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

function getTheme(isDarkMode = settings.darkMode) {
    return isDarkMode ? themes.dark : themes.light;
}

function getFontSize(size) {
    return fontSizes[size] ?? fontSizes.Default;
}

function getFontFamily(chosenFont) {
    return fontFamilies[chosenFont] ?? fontFamilies.Default;
}

/**
 * Get the reference system data for a given system.
 * If the data is not in the cache, it will be fetched and stored.
 *
 * @param {string} system The name of the system
 * @returns {Promise<Object>} The reference system data
 */
async function getReferenceSystemData(system) {
    if (!referenceSystemData.has(system)) {
        const systemInfo = await getSystemInfo(system);
        referenceSystemData.set(system, systemInfo["reference"]);
    }
    return referenceSystemData.get(system);
}

/**
 * Convert a viewport position into normalised device coordinates (NDC) for the given canvas.
 * NDC range from -1 to 1 on both axes.
 *
 * @param {number} clientX The x position in viewport coordinates
 * @param {number} clientY The y position in viewport coordinates
 * @param {HTMLCanvasElement} canvas The canvas to normalise against
 * @returns {THREE.Vector2} The position in NDC
 */
function getNormalisedDeviceCoordinates(clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();

    return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
    );
}

/**
 * Finds the label at the given screen coordinates and returns the name of the object that
 * the label belongs to. If several labels overlap, then the object name corresponding to
 * the closest label to the camera is returned.
 *
 * @param {number} clientX The x position in viewport coordinates
 * @param {number} clientY The y position in viewport coordinates
 * @returns {string|null} The name of the object owning the closest label at the given
 * coordinates, or null if no labels were found at this coordinates.
 */
function getLabelNameAt(clientX, clientY) {
    let closestName = null;
    let closestDistanceSquared = Infinity;
    const labelWorldPosition = new THREE.Vector3();

    for (const [name, label] of objectLabels) {
        // Skip any labels whose objects are not visible
        const mesh = objectMeshes.get(name);
        if (!mesh.visible || !mesh.parent.visible) {
            continue;
        }

        const rect = label.element.getBoundingClientRect();
        // Check whether the given point is inside the label's bounding rectangle
        const isOverLabel =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom;

        if (!isOverLabel) {
            continue;
        }

        label.getWorldPosition(labelWorldPosition);
        const labelDistanceSquared =
            camera.position.distanceToSquared(labelWorldPosition);

        if (labelDistanceSquared < closestDistanceSquared) {
            closestDistanceSquared = labelDistanceSquared;
            closestName = name;
        }
    }

    return closestName;
}

/**
 * Determines which object in the scene is at the given coordinates (if any). Checks are made
 * in the following order and the first match is returned:
 * 1. The object's own mesh (hitboxes excluded)
 * 2. The object's HTML label
 * 3. The object's hitbox (a child of the object's mesh)
 *
 * @param {number} clientX The x position in viewport coordinates
 * @param {number} clientY The y position in viewport coordinates
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 * @returns {string|null} The name of the object at the given coordinates, or null if no
 * object was found at these coordinates.
 */
function getObjectNameAt(clientX, clientY, canvas) {
    // The three.js raycaster expects NDC coordinates
    const mouseNdc = getNormalisedDeviceCoordinates(clientX, clientY, canvas);

    // Create a ray from the camera through the mouse's position on the screen
    raycaster.setFromCamera(mouseNdc, camera);

    // Get all the meshes for all of the visible objects in the scene
    const meshes = Array.from(objectMeshes.values()).filter(
        (mesh) => mesh.visible && mesh.parent.visible,
    );

    // Check whether the ray intersects any object meshes (excludes hitboxes)
    let meshHits = raycaster.intersectObjects(meshes, false);
    if (meshHits.length > 0) {
        // Return the name of the nearest object the ray intersected
        return meshHits[0].object.userData.name;
    }

    // Get the label name at the given coordinates (if any)
    const labelName = getLabelNameAt(clientX, clientY);
    if (labelName) {
        return labelName;
    }

    // Check whether the ray intersects any hitboxes (by checking children of objects)
    const hitboxHits = raycaster.intersectObjects(meshes, true);

    if (hitboxHits.length > 0) {
        return hitboxHits[0].object.parent.userData.name;
    }

    return null;
}

/**
 * Get the orbital data values for all objects in the given system that are not hidden.
 *
 * @param {string} system The name of the system
 * @param {Object} orbitalData Map of object name to orbital data
 * @param {boolean} [useDefault=false] Whether to check default visibility instead of current visibility
 * @returns {Object[]} Orbital data values for visible objects only
 */
function getVisibleOrbitalDataValues(system, orbitalData, useDefault = false) {
    const isHidden = useDefault ? isObjectHiddenByDefault : isObjectHidden;

    return Object.keys(orbitalData)
        .filter((name) => !isHidden(system, name))
        .map((name) => orbitalData[name]);
}

/**
 * Get the view radius for a given system based on the maximum apoapsis of all visible objects.
 *
 * @param {string} system The name of the system
 * @param {boolean} [useDefault=false] Whether to check default visibility instead of current visibility
 * @returns {Promise<number>} The view radius for the system
 */
async function getViewRadiusForSystem(system, useDefault = false) {
    const referenceSystemData = await getReferenceSystemData(system);
    const orbitalDataValues = getVisibleOrbitalDataValues(
        system,
        referenceSystemData.orbital_data,
        useDefault,
    );
    const maxApoapsis = calculateMaxApoapsis(orbitalDataValues);
    return maxApoapsis * viewRadiusMultiplier;
}

/**
 * Update the view radius based on the current system, whether the habitable zone is shown, and whether
 * the Solar System is being compared. The view radius is set to the maximum of the current system's view radius,
 * the Solar System's view radius (if comparing), and the habitable zone's end radius (if shown).
 *
 * @param {boolean} comparingToSolarSystem Whether the Solar System is being compared
 * @param {boolean} habitableZoneShown Whether the habitable zone is shown
 */
async function updateViewRadius(comparingToSolarSystem, habitableZoneShown) {
    const viewRadiusForCurrentSystem =
        await getViewRadiusForSystem(currentSystem);

    let newViewRadius = viewRadiusForCurrentSystem;

    if (comparingToSolarSystem) {
        newViewRadius = Math.max(newViewRadius, solarSystemDefaultViewRadius);
    }

    if (habitableZoneShown && habitableZone) {
        const viewRadiusForHabitableZone =
            habitableZone.end * viewRadiusMultiplier;
        newViewRadius = Math.max(newViewRadius, viewRadiusForHabitableZone);
    }

    viewRadius = newViewRadius;
}

/**
 * Handles when the canvas is clicked on while the user is not moving the camera.
 * Detects if an object was clicked and, if so, fires an event to notify other components
 * that an object was clicked.
 *
 * @param {MouseEvent} event The click event
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
function onCanvasClick(event, canvas) {
    const name = getObjectNameAt(event.clientX, event.clientY, canvas);

    if (!name) {
        return;
    }

    bus.publish(EVENTS.SIM.OBJECT_CLICK, { objectName: name });
}

/**
 * Creates a radial glow texture for use as a sprite map (e.g., for rendering stars).
 * The texture has a white core that fades into the given colour, then fades to
 * transparent at the edge.
 *
 * @param {string} colour CSS colour string which the glow fades into
 * @returns {THREE.CanvasTexture} Texture for a sprite/point material map
 */
function createGlowTexture(colour) {
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
 * If the target object does not exist, then its mesh is created at the given position.
 * If the target object does exist, then its position is updated.
 *
 * @param {string} name Name of the object
 * @param {Object} position Position of the object
 * @param {THREE.Group} group The group to add the object to
 * @param {string} colour CSS colour string used for this object's label
 */
function createOrUpdateObjectMesh(name, position, group, colour) {
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

        if (comparingToSolarSystem && group === solarSystemGroup) {
            mesh.visible = !isObjectHiddenByDefault("Solar System", name);
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

        const labelDiv = document.createElement("div");
        labelDiv.className = "planet-label";
        labelDiv.textContent = name;
        labelDiv.style.color = colour;
        if (group === solarSystemGroup) {
            labelDiv.style.opacity = comparisonLabelOpacity;
        }
        labelDiv.style.fontSize = getFontSize(settings.textSize);
        labelDiv.style.fontFamily = getFontFamily(settings.font);
        labelDiv.style.fontWeight = "bold";
        labelDiv.style.backgroundColor = getTheme().labelBackground;
        labelDiv.style.padding = "1px 5px";
        labelDiv.style.borderRadius = "4px";
        labelDiv.style.whiteSpace = "nowrap";

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 0, 0);
        label.visible = simulationState.labelsShown;
        mesh.add(label);
        objectLabels.set(name, label);
    }

    mesh.scale.set(objectScale, objectScale, objectScale);
    mesh.position.set(position.x, position.y, position.z);
}

/**
 * Determines whether an object's orbit should be visible. An orbit should be visible if the
 * orbit lines are visible and the object is visible.
 *
 * Given visibility values take precedence over saved simulation state (since this state
 * may not have been synced yet).
 *
 * @param {string} objectName Name of the object associated with the orbit
 * @param {string} [system=currentSystem] The system associated with the object
 * @param {Object} [options] Visibility values
 * @param {boolean} [options.orbitsVisible] Whether orbits are visible
 * @param {boolean} [options.objectVisible] Whether the object is visible
 * @param {boolean} [options.useDefault=false] Whether to check the object's default visibility
 * instead of its current visibility
 * @returns {boolean} Whether the orbit should be visible
 */
function shouldShowOrbit(
    objectName,
    system = currentSystem,
    { orbitsVisible, objectVisible, useDefault = false } = {},
) {
    const areOrbitsShown = orbitsVisible ?? simulationState.orbitsShown;
    const isObjectShown =
        objectVisible ??
        (useDefault
            ? !isObjectHiddenByDefault(system, objectName)
            : !isObjectHidden(system, objectName));

    return areOrbitsShown && isObjectShown;
}

/**
 * Approximate a given opacity by blending the given colour towards the current background.
 * Used to get the colour for Line2, as Line2 doesn't correctly set the opacity for joints.
 *
 * @param {string} colour The base colour to fade
 * @param {*} opacity The desired opacity from 0 (fully background) to 1 (fully colour)
 * @param {*} [isDarkMode=settings.isDarkMode] Whether to fade against the dark or light theme background
 * @returns A new colour faded towards the background colour by (1 - opacity)
 */
function getFadedColour(colour, opacity, isDarkMode = settings.darkMode) {
    const theme = getTheme(isDarkMode);
    const backgroundColour = theme.background;

    return new THREE.Color(colour).lerp(backgroundColour, 1 - opacity);
}

/**
 * If the target orbit does not exist, then its orbital line is created with the given orbital data.
 * If the target orbital line does exist, then it is updated.
 *
 * The orbital line is coloured to match its object.
 *
 * @param {string} name Name of the object associated with the orbital line
 * @param {Object} position The position in real coordinates (xyz) of the object
 * @param {Object} orbitalData Orbital data for the line
 * @param {THREE.Group} group The group to add the orbital line to
 * @param {string} colour CSS colour string used for this orbit's line
 */
function createOrUpdateOrbitalLine(name, position, orbitalData, group, colour) {
    const { a, e, inc, Omega, omega } = orbitalData;

    if (e === 1) return; // Parabolic orbits are not supported for now

    let line = orbitalLines.get(name);

    if (!line) {
        const canvas = renderer.domElement;
        const geometry = new MeshLineGeometry();

        const material = new MeshLineMaterial({
            // Remain constant size (do not grow in size as user zooms in)
            sizeAttenuation: false,
            transparent: true,
            resolution: new THREE.Vector2(
                window.innerWidth,
                window.innerHeight,
            ),
        });

        if (group === solarSystemGroup) {
            const comparisonColour = getFadedColour(
                colour,
                comparisonOrbitOpacity,
            );

            material.lineWidth = COMPARISON_ORBIT_LINE_WIDTH;
            material.color.set(comparisonColour);
        } else {
            material.lineWidth = ORBIT_LINE_WIDTH;
            material.color.set(colour);
        }

        if (e < 1) {
            material.alphaMap = createOpaqueOrbitAlphaTexture();
            material.useAlphaMap = 1;
        }

        material.resolution.set(canvas.clientWidth, canvas.clientHeight);

        line = new THREE.Mesh(geometry, material);

        // Render above habitable zone to prevent z fighting
        line.renderOrder = 1;

        if (comparingToSolarSystem && group === solarSystemGroup) {
            line.visible = shouldShowOrbit(name, "Solar System", {
                useDefault: true,
            });
        } else {
            line.visible = shouldShowOrbit(name, currentSystem);
        }

        group.add(line);
        orbitalLines.set(name, line);
    }

    // Update the geometry of the line to match the orbital parameters
    const points = [];
    let thetaStart = 0;
    let thetaEnd = 2 * Math.PI;

    // Limit the angle range for hyperbolic orbits to its asymptotes
    if (e > 1) {
        const thetaLimit = Math.acos(-1 / e);
        const epsilon = 1e-10; // Avoid rendering issues at the asymptotes

        thetaStart = -thetaLimit + epsilon;
        thetaEnd = thetaLimit - epsilon;
    }

    const thetaStep = (thetaEnd - thetaStart) / ORBIT_POINTS_COUNT;

    /**
     * The position of the object in world (xyz) coordinate space.
     */
    const worldObjectPosition = new THREE.Vector3(
        position.x,
        position.y,
        position.z,
    );

    /**
     * Rotation matrix: local (coordinate system of orbit plane) -> world
     */
    const rotationMatrix = calculateRotationMatrix(Omega, inc, omega);

    /**
     * World -> local (coordinate system of orbit plane)
     */
    const inverseRotationMatrix = rotationMatrix.clone().invert();

    /**
     * Position of object in local (orbit plane) coordinates
     */
    const localObjectPosition = worldObjectPosition.applyMatrix4(
        inverseRotationMatrix,
    );
    /**
     * Angle between positive x-axis (in local coordinates) and the point
     * (localPosition.x, localPosition.y) from the 2-argument arctangent.
     */
    let objectTheta = Math.atan2(localObjectPosition.y, localObjectPosition.x);
    if (objectTheta < 0) objectTheta += 2 * Math.PI;

    for (let theta = thetaStart; theta <= thetaEnd; theta += thetaStep) {
        const { x, y } = calculateOrbitalPosition(a, e, theta);
        points.push(x, y, 0);

        if (objectTheta > theta && objectTheta < theta + thetaStep) {
            // Add a point on the exact coordinates of the object to prevent
            // sampling issues where the object's position falls between points.
            points.push(localObjectPosition.x, localObjectPosition.y, 0);
        }
    }

    if (e > 1) {
        // Add the last point at the end of the range to ensure the line reaches the asymptote
        const { x, y } = calculateOrbitalPosition(a, e, thetaEnd);
        points.push(x, y, 0);
    }

    if (e < 1) {
        /**
         * Proportion of a full revolution the object is from its starting
         * point/angle.
         */
        const objectProgress = THREE.MathUtils.clamp(
            (objectTheta - thetaStart) / (thetaEnd - thetaStart),
            0,
            1,
        );

        updateOrbitAlphaTexture(line.material.alphaMap, objectProgress);

        // Create or update the position attribute and widen the line at the object
        line.geometry.setPoints(points, (progress) => {
            /**
             * Proportion of a full revolution this point of `progress` is
             * from the object.
             */
            const distance = (objectProgress - progress + 1) % 1;

            return ORBIT_LINE_WIDTH_MODULATION_FUNCTION(distance);
        });
    } else {
        // Display non-elliptical orbits as constant width
        line.geometry.setPoints(points);
    }

    // Rotate the line to match the orbital parameters
    line.quaternion.setFromRotationMatrix(rotationMatrix);
}

const ORBIT_LINE_MINIMUM_OPACITY = 0.2;
const ORBIT_LINE_MIN_WIDTH = 0.5;

/**
 * A function defining the curve/profile of the opacity/width modulation of
 * the orbit line.
 * @param {Number} distance Proportion of a full revolution this point is from
 * the object.
 * @returns Scale factor betwee 0 and 1 of opacity/line width.
 */
const ORBIT_LINE_OPACITY_MODULATION_FUNCTION = (distance) =>
    Math.max(ORBIT_LINE_MINIMUM_OPACITY, 1 - distance);

const ORBIT_LINE_WIDTH_MODULATION_FUNCTION = (distance) =>
    Math.max(ORBIT_LINE_MIN_WIDTH, 1 - distance);

const RGBA_CHANNEL_COUNT = 4;
const RGBA_MAX_VALUE = 255;

/**
 * @returns `THREE.DataTexture` of a RGBA alpha map filled with values of 255
 * (i.e. a fully opaque alpha map) based on the number of points in the simulation.
 */
function createOpaqueOrbitAlphaTexture() {
    const data = new Uint8Array(ORBIT_POINTS_COUNT * RGBA_CHANNEL_COUNT);
    data.fill(RGBA_MAX_VALUE);

    /**
     * Create ORBIT_POINTS_COUNT x 1 texture (i.e. a 1D texture) for an opacity
     * map. This is in RGBA format, so each 'point' of the texture is
     * represented by 4 bytes: a red, green, blue, and alpha channel.
     */
    const texture = new THREE.DataTexture(
        data,
        ORBIT_POINTS_COUNT,
        1,
        THREE.RGBAFormat,
    );

    texture.needsUpdate = true;

    return texture;
}

/**
 * Updates the given alpha `texture` map based on the new value of
 * `objectProgress` (i.e. the new position of the object). Used so that as the
 * object moves around its orbit, the opacity of the orbit updates correctly
 * so that it is most opaque at the object and gets fainter (or as defined
 * by the opacity modulation function).
 * @param {THREE.DataTexture} texture
 * @param {Number} objectProgress Proportion of a full revolution the object is
 * from its starting point/angle (in interval [0, 1])
 */
function updateOrbitAlphaTexture(texture, objectProgress) {
    /**
     * `texture.image` is an object containing fields `data` (the actual byte
     * array of the texture), `width` (the number of bytes) in the 'width'
     * dimension, and `height`. Here we get the raw byte array and the width
     * of the texture.
     */

    const { data, width } = texture.image;

    // Iterate over the raw texture byte array
    for (let i = 0; i < width; i++) {
        /**
         * Proportion of array traversed (in interval [0, 1])
         */
        const progress = i / (width - 1);

        /**
         * Proportion of a full revolution this point of `progress` is
         * from the object.
         */
        const distance = (objectProgress - progress + 1) % 1;

        const opacity = ORBIT_LINE_OPACITY_MODULATION_FUNCTION(distance);

        /**
         * Offset of red channel/byte
         */
        const offset = i * RGBA_CHANNEL_COUNT;

        /**
         * Offset of alpha channel/byte. Here we add 3 because `offset` is the
         * offset of the byte of the red channel. To get the offset of the alpha
         * channel, we add 3.
         * 
         * [..., red, green, blue, alpha, red, ...]
         */
        const alphaOffset = offset + 3;

        data[alphaOffset] = Math.round(opacity * RGBA_MAX_VALUE);
    }

    texture.needsUpdate = true;
}

/**
 * Create a mesh representing the habitable zone as a ring in the XY plane.
 */
function createHabitableZoneMesh() {
    const startRadius = habitableZone.start;
    const endRadius = habitableZone.end;

    const geometry = new THREE.RingGeometry(
        startRadius,
        endRadius,
        habitableZoneSegments,
    );
    const material = new THREE.MeshBasicMaterial({
        color: habitableZoneColor,
        opacity: habitableZoneOpacity,
        transparent: true,
        side: THREE.DoubleSide,

        // Do not update depth buffer (to prevent z-fighting with other meshes)
        depthWrite: false,
    });
    habitableZoneMesh = new THREE.Mesh(geometry, material);
    habitableZoneMesh.visible = simulationState.habitableZoneShown;
}

/**
 * Create a reference grid in the XY plane.
 */
function createReferenceGrid() {
    const referenceGridColor = getTheme().referenceGrid;
    referenceGrid = new THREE.GridHelper(
        referenceGridSize,
        referenceGridDivisions,
    );
    referenceGrid.geometry.rotateX(Math.PI / 2); // Rotate the grid to lie in the XY plane
    referenceGrid.material.color.set(referenceGridColor);
    referenceGrid.material.transparent = true;
    referenceGrid.material.opacity = referenceGridOpacity;
    referenceGrid.material.vertexColors = false; // Use a single colour for the grid lines
    referenceGrid.visible = simulationState.referenceGridShown;

    updateReferenceGridScale(cameraDefaults.position, cameraDefaults.target);
}

/**
 * Update the scale of the reference grid based on the camera's distance to the target.
 *
 * The grid is scaled so that a fixed number of divisions are visible to the camera when looking at it
 * perpendicularly.
 *
 * @param {THREE.Vector3} cameraPosition The position of the camera
 * @param {THREE.Vector3} targetPosition The position of the camera's target
 */
function updateReferenceGridScale(cameraPosition, targetPosition) {
    const cameraDistanceToTargetProjection =
        calculateCameraDistanceToTargetProjection(
            cameraPosition,
            targetPosition,
        );

    const desiredReferenceGridDivisionSize = calculateReferenceGridDivisionSize(
        fov,
        cameraDistanceToTargetProjection,
        divisionsInView,
    );

    const coveredRange =
        desiredReferenceGridDivisionSize * referenceGridDivisions;

    let viewRadiusToCover = currentSystemDefaultViewRadius;
    if (comparingToSolarSystem) {
        viewRadiusToCover = Math.max(
            viewRadiusToCover,
            solarSystemDefaultViewRadius,
        );
    }

    if (coveredRange < viewRadiusToCover * 2) return; // Don't scale if it doesn't cover the view radius

    const scaleFactor =
        desiredReferenceGridDivisionSize / referenceGridDivisionSize;
    referenceGrid.scale.set(scaleFactor, scaleFactor, scaleFactor);
}

/**
 * Update the positions of all objects in the current system.
 * Update the calendar to display the current simulation time.
 *
 * @param {boolean} [forceCalendarUpdate=true] Whether or not to force an update to the calendar (bypasses the throttle)
 */
async function updateSimulation(forceCalendarUpdate = true) {
    // Take comparingToSolarSystem at beginning of function call to prevent mid-function changes
    const isComparingToSolarSystem = comparingToSolarSystem;
    const isDarkMode = settings.darkMode;

    const systems = [currentSystem];
    if (isComparingToSolarSystem) {
        systems.push("Solar System");
    }
    const allSystemData = await getMultipleSystemsData(
        systems,
        currentSimulationTime,
    );
    const currentSystemData = allSystemData[currentSystem];
    updateCalendar(currentSimulationTime, forceCalendarUpdate);

    for (const [name, position] of Object.entries(
        currentSystemData.positions,
    )) {
        createOrUpdateObjectMesh(
            name,
            position,
            currentSystemGroup,
            getCurrentSystemColour(name, isDarkMode),
        );
    }
    for (const [name, orbitalData] of Object.entries(
        currentSystemData.orbital_data,
    )) {
        createOrUpdateOrbitalLine(
            name,
            currentSystemData.positions[name],
            orbitalData,
            currentSystemGroup,
            getCurrentSystemColour(name, isDarkMode),
        );
    }

    if (isComparingToSolarSystem) {
        const solarSystemData = allSystemData["Solar System"];
        const overlayColour =
            comparisonOverlayColour[isDarkMode ? "dark" : "light"];

        // The comparison overlay uses a single colour for every object label and orbit
        for (const [name, position] of Object.entries(
            solarSystemData.positions,
        )) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateObjectMesh(
                name,
                position,
                solarSystemGroup,
                overlayColour,
            );
        }
        for (const [name, orbitalData] of Object.entries(
            solarSystemData.orbital_data,
        )) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateOrbitalLine(
                name,
                solarSystemData.positions[name],
                orbitalData,
                solarSystemGroup,
                overlayColour,
            );
        }
    }
}

/**
 * Sync the calendar to the current simulation time (bypasses the throttle).
 */
export function syncCalendar() {
    if (currentSimulationTime === null) {
        return;
    }

    updateCalendar(currentSimulationTime, true);
}

/**
 * Align the system's average normal with the up vector.
 *
 * @param {THREE.Group} group The group to align
 * @param {boolean} [useDefault=false] Whether to check default visibility instead of current visibility
 */
async function alignSystemToCameraUp(group, useDefault = false) {
    let system = currentSystem;
    if (group === solarSystemGroup) {
        system = "Solar System";
    }

    const referenceSystemData = await getReferenceSystemData(system);
    const orbitalDataValues = getVisibleOrbitalDataValues(
        system,
        referenceSystemData.orbital_data,
        useDefault,
    );
    const averageNormal = calculateAverageNormal(orbitalDataValues);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        averageNormal,
        cameraDefaults.up,
    );
    group.quaternion.copy(quaternion);
}

/**
 * Calculate the camera and controls settings based on the view radius.
 *
 * @param {number} viewRadius The radius of view to fit within the camera
 * @returns {Object} The camera and controls settings
 */
function calculateCameraAndControlsSettings(viewRadius) {
    const controlsMinDistance = objectSize * controlsMinMultiplier;

    // Camera distance must be at least the minimum distance for the controls
    const epsilon = 1e-10; // Ensure the camera distance is slightly greater than controls min distance
    const cameraDistance = Math.max(
        calculateCameraDistance(fov, viewRadius),
        controlsMinDistance + epsilon
    );

    // Controls max distance must be at least camera distance * max multiplier,
    // and must be able to zoom by at least controlsMinZoomFactor
    const controlsMaxDistance = Math.max(
        cameraDistance * controlsMaxMultiplier,
        controlsMinDistance * controlsMinZoomFactor,
    );

    const cameraNear = objectSize * cameraNearMultiplier;
    const cameraFar = cameraDistance * cameraFarMultiplier;

    return {
        cameraDistance,
        cameraNear,
        cameraFar,
        controlsMinDistance,
        controlsMaxDistance,
    };
}

/**
 * Initialise the camera for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {Object} cameraSettings The camera settings
 * @param {number} cameraSettings.cameraDistance The distance of the camera
 * @param {number} cameraSettings.cameraNear The near plane of the camera
 * @param {number} cameraSettings.cameraFar The far plane of the camera
 */
function initOrUpdateCamera(canvas, { cameraDistance, cameraNear, cameraFar }) {
    cameraDefaults.position = calculateDefaultCameraPosition(
        cameraDefaults.up,
        cameraDistance,
    );

    if (!camera) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        camera = new THREE.PerspectiveCamera(
            fov,
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

/**
 * Initialise the controls for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {Object} controlsSettings The controls settings
 * @param {number} controlsSettings.controlsMinDistance The minimum distance for the controls
 * @param {number} controlsSettings.controlsMaxDistance The maximum distance for the controls
 */
function initOrUpdateControls(
    canvas,
    { controlsMinDistance, controlsMaxDistance },
) {
    if (!controls) {
        controls = new OrbitControls(camera, canvas);
        controls.addEventListener("start", () => {
            animateCameraAndControls = false; // Stop animating on user interaction
        });

        controls.target.copy(cameraDefaults.target);
        controls.update();
    }
    controls.minDistance = controlsMinDistance;
    controls.maxDistance = controlsMaxDistance;
    controls.zoomSpeed = controlsZoomSpeed;

    if (controlsChangeHandler) {
        controls.removeEventListener("change", controlsChangeHandler);
    }
    controlsChangeHandler = createControlsChangeHandler(viewRadius);
    controls.addEventListener("change", controlsChangeHandler);
}

/**
 * Creates a handler for the controls change event.
 * @param {number} viewRadius The radius of view to fit within the camera
 * @returns {Function} The controls change handler
 */
function createControlsChangeHandler(viewRadius) {
    return () => {
        isDragging = true;
        const cameraOffset = camera.position.clone().sub(controls.target);

        // Clamp the target position to be within the view radius
        const minLength = 0;
        const maxLength = viewRadius;
        controls.target.clampLength(minLength, maxLength);

        camera.position.copy(controls.target.clone().add(cameraOffset));
        updateReferenceGridScale(camera.position, controls.target);
    };
}

/**
 * Register pointer listeners on the canvas for raycasting. A click is ignored if it was part
 * of a camera drag, so that moving around and orienting the scene doesn't accidentally select
 * objects on the scene.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
function initRaycastingEvents(canvas) {
    // Detect when the user holds their mouse down on the canvas
    canvas.addEventListener("pointerdown", () => {
        isDragging = false;
    });

    canvas.addEventListener("click", (event) => {
        // Handle the event as long as the user isn't dragging the camera
        if (!isDragging) {
            onCanvasClick(event, canvas);
        }
    });
}

/**
 * Register a pointer listener on the canvas that updates the cursor to
 * a pointer to indicate when an object can be clicked.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
function initHoverCursor(canvas) {
    canvas.addEventListener("pointermove", (event) => {
        const name = getObjectNameAt(event.clientX, event.clientY, canvas);
        // Set the cursor to a pointer if there is an object at the cursor
        canvas.style.cursor = name ? "pointer" : "default";
    });
}

/**
 * Initialise the scene for the simulation renderer.
 */
function initScene() {
    scene = new THREE.Scene();
    scene.background = getTheme().background;
    scene.add(new THREE.AmbientLight(0xffffff, 1));
    scene.add(currentSystemGroup);
    scene.add(solarSystemGroup);
    scene.add(habitableZoneMesh);
    scene.add(referenceGrid);
}

/**
 * Initialise the label renderer for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 */
function initLabelRenderer(canvas) {
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = "fixed";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.left = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement.appendChild(labelRenderer.domElement);
}

/**
 * Initialise the timer for the simulation renderer.
 */
function initTimer() {
    timer = new THREE.Timer();
    timer.connect(document); // Use Page Visibility API
}

/**
 * Initialises the requested system to render
 *
 * @param {string} name System name
 */
export async function init(name) {
    currentSystem = name;
    currentSimulationTime = getSimulationTime(name);

    const systemInfo = await getSystemInfo(currentSystem);
    habitableZone = systemInfo["habitable zone"];
    currentSystemColours = Object.fromEntries(
        Object.entries(systemInfo.objects ?? {}).map(([name, data]) => [
            name,
            data.colour,
        ]),
    );

    objectTypes = Object.fromEntries(
        Object.entries(systemInfo.objects ?? {}).map(([name, data]) => [
            name,
            data.type,
        ]),
    );

    const canvas = document.getElementById("simulation-canvas");
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    referenceSystemData.set(
        // Add this system's reference data to cache
        currentSystem,
        systemInfo["reference"],
    );

    await updateViewRadius(
        false, // Not comparing to the Solar System
        simulationState.habitableZoneShown,
    );

    currentSystemDefaultViewRadius = await getViewRadiusForSystem(
        currentSystem,
        true,
    );
    solarSystemDefaultViewRadius = await getViewRadiusForSystem(
        "Solar System",
        true,
    );

    objectSize = currentSystemDefaultViewRadius * objectSizeMultiplier; // Set the object size
    hitboxPadding = currentSystemDefaultViewRadius * hitboxPaddingMultiplier; // Set the hitbox padding size

    // Align the system's average normal with the up vector (Z-axis)
    alignSystemToCameraUp(currentSystemGroup);

    const cameraAndControlsSettings =
        calculateCameraAndControlsSettings(viewRadius);
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(canvas, cameraAndControlsSettings);

    initRaycastingEvents(canvas);
    initHoverCursor(canvas);
    initLabelRenderer(canvas);
    initTimer();

    createHabitableZoneMesh();
    createReferenceGrid();

    initScene();

    /**
     * Persist the current simulation time, formatted simulation date, and days elapsed text
     * before the simulation is exited
     */
    window.addEventListener("pagehide", () => {
        setSimulationTime(currentSystem, currentSimulationTime);

        const formattedSimulationDate = formatSimulationDate(
            currentSimulationTime,
        );
        setFormattedSimulationDate(currentSystem, formattedSimulationDate);

        const elapsedDaysText = getElapsedDaysText(currentSimulationTime);
        setElapsedText(currentSystem, elapsedDaysText);
    });

    // Start rendering frames and updating the simulation
    updateSimulation();
    renderFrame();
}

export function stepForward() {
    currentSimulationTime += getSimulationSpeedMilliseconds(currentSystem);
    updateSimulation();
}

export function stepBack() {
    currentSimulationTime -= getSimulationSpeedMilliseconds(currentSystem);
    updateSimulation();
}

export function resetSimulationTimeToNow() {
    currentSimulationTime = Date.now();
    updateSimulation();
}

export function setSimulationTimeToTime(time) {
    currentSimulationTime = time;
    updateSimulation();
}

export async function resetView(topDown = true) {
    const canvas = renderer.domElement;

    await updateViewRadius(comparingToSolarSystem, habitableZoneMesh?.visible);

    // Update the camera and controls for the new view radius
    const cameraAndControlsSettings =
        calculateCameraAndControlsSettings(viewRadius);
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(canvas, cameraAndControlsSettings);

    // Animate to the default controls target
    animateControlsTargetTo.copy(cameraDefaults.target);

    if (topDown) {
        // Animate to the default camera position
        animateCameraPositionTo.copy(cameraDefaults.position);
    } else {
        // Animate camera position to the same direction as the current camera but at the default distance

        const defaultCameraDistance = cameraDefaults.position.length();
        const currentCameraDirection = camera.position
            .clone()
            .sub(controls.target)
            .normalize();

        const newCameraOffset = currentCameraDirection.multiplyScalar(
            defaultCameraDistance,
        );
        const newCameraPosition = animateControlsTargetTo
            .clone()
            .add(newCameraOffset);

        animateCameraPositionTo.copy(newCameraPosition);
    }

    currentCameraAnimationStep = 0;
    animateCameraAndControls = true;
}

export async function compareToSolarSystem() {
    const canvas = renderer.domElement;

    await updateViewRadius(true, habitableZoneMesh?.visible);

    // Scale objects for comparison as the smaller of the two sizes
    const comparisonObjectSize =
        Math.min(currentSystemDefaultViewRadius, solarSystemDefaultViewRadius) *
        objectSizeMultiplier;
    objectScale = comparisonObjectSize / objectSize;

    // Align the solar system's average normal with the up vector (Z-axis)
    alignSystemToCameraUp(solarSystemGroup, true);

    solarSystemGroup.visible = true;

    const cameraAndControlsSettings =
        calculateCameraAndControlsSettings(viewRadius);
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(canvas, cameraAndControlsSettings);

    resetView();

    updateSimulation();
}

export async function hideSolarSystem() {
    objectScale = 1; // Reset object scale to default

    // Update the camera and controls to fit the current system again

    const canvas = renderer.domElement;
    await updateViewRadius(false, habitableZoneMesh?.visible);
    solarSystemGroup.visible = false;

    const cameraAndControlsSettings =
        calculateCameraAndControlsSettings(viewRadius);
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(canvas, cameraAndControlsSettings);

    resetView();

    updateSimulation();
}

export function setHabitableZoneVisibility(value) {
    if (habitableZoneMesh) {
        habitableZoneMesh.visible = value;
    }

    resetView(false);
}

export function setLabelsVisibility(value) {
    for (const label of objectLabels.values()) {
        label.visible = value;
    }
}

export function setOrbitsVisibility(value) {
    for (const [name, orbit] of orbitalLines) {
        orbit.visible = shouldShowOrbit(name, currentSystem, {
            orbitsVisible: value,
        });
    }
}

export function setReferenceGridVisibility(value) {
    if (referenceGrid) {
        referenceGrid.visible = value;
    }
}

export function setObjectVisibility(name, value) {
    const mesh = objectMeshes.get(name);
    if (mesh) {
        mesh.visible = value;
    }

    const orbit = orbitalLines.get(name);
    if (orbit) {
        orbit.visible = shouldShowOrbit(name, currentSystem, {
            objectVisible: value,
        });
    }

    resetView(false);
}

export function setFontSize(size) {
    let fontSize = getFontSize(size);
    for (const label of objectLabels.values()) {
        label.element.style.fontSize = fontSize;
    }
}

export function setFontFamily(chosenFont) {
    let fontFamily = getFontFamily(chosenFont);
    for (const label of objectLabels.values()) {
        label.element.style.fontFamily = fontFamily;
    }
}

export function toggleSimulationDarkMode(isDarkMode) {
    const theme = getTheme(isDarkMode);

    scene.background = theme.background;
    referenceGrid.material.color.set(theme.referenceGrid);

    const labelBackground = theme.labelBackground;
    const overlayColour =
        comparisonOverlayColour[isDarkMode ? "dark" : "light"];

    for (const [name, objectMesh] of objectMeshes) {
        const isComparisonOverlay = objectMesh.parent === solarSystemGroup;

        const objectColour = getCurrentSystemColour(name, isDarkMode);

        objectMesh.material.color.set(
            isComparisonOverlay ? overlayColour : objectColour,
        );

        // Update the glow texture based on the object colour in the new theme
        if (objectTypes[name] === "star") {
            const glowSprite = objectMesh.children.find(
                (child) => child instanceof THREE.Sprite,
            );

            if (glowSprite) {
                glowSprite.material.map?.dispose();
                glowSprite.material.map = createGlowTexture(objectColour);
                glowSprite.material.needsUpdate = true;
            }
        }
    }

    for (const [name, label] of objectLabels) {
        const mesh = objectMeshes.get(name);
        const isComparisonOverlay = mesh?.parent === solarSystemGroup;

        label.element.style.backgroundColor = labelBackground;
        label.element.style.color = isComparisonOverlay
            ? overlayColour
            : getCurrentSystemColour(name, isDarkMode);
    }

    const fadedOverlayColour = getFadedColour(
        overlayColour,
        comparisonOrbitOpacity,
        isDarkMode,
    );

    for (const [name, orbit] of orbitalLines) {
        const isComparisonOverlay = orbit.parent === solarSystemGroup;

        orbit.material.color.set(
            isComparisonOverlay
                ? fadedOverlayColour
                : getCurrentSystemColour(name, isDarkMode),
        );
    }
}

/**
 * Resize the renderer if the user has resized their screen.
 */
function resizeRendererToDisplaySize() {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
        renderer.setSize(width, height, false);
        labelRenderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        for (const line of orbitalLines.values()) {
            line.material.resolution.set(width, height);
        }
    }

    return needResize;
}

/**
 * Render the meshes and objects on every animation frame.
 *
 * TODO: Rendering the system on every animation frame leads to high CPU usage.
 */
async function renderFrame(timestamp) {
    resizeRendererToDisplaySize();

    timer.update(timestamp);

    if (running && !frozen) {
        // Measure the change in time in seconds since the last frame
        const deltaTime = timer.getDelta();

        currentSimulationTime +=
            getSimulationSpeedMilliseconds(currentSystem) * deltaTime;

        // Update the simulation but do not bypass the calendar update throttle
        updateSimulation(false);
    }

    if (animateCameraAndControls) {
        // Animate the camera and controls for totalCameraAnimationSteps steps.
        // Animation stops after enough steps have been taken
        // or if the user interacts with the controls.

        if (currentCameraAnimationStep >= totalCameraAnimationSteps) {
            animateCameraAndControls = false;
            camera.position.copy(animateCameraPositionTo);
            controls.target.copy(animateControlsTargetTo);

        } else {
            // Interpolate towards the desired position and target
            camera.position.lerp(animateCameraPositionTo, cameraAnimationSpeed);
            controls.target.lerp(animateControlsTargetTo, cameraAnimationSpeed);
            currentCameraAnimationStep++;
        }

        controls.update();
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    // Invoke render() on the next frame
    requestAnimationFrame(renderFrame);
}
