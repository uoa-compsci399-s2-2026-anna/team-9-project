import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import {
    simulationState,
    running,
    frozen,
    comparingToSolarSystem,
    isObjectHidden,
    getSimulationSpeedMilliseconds,
    getSimulationTime,
    setSimulationTime,
    setFormattedSimulationDate,
    setElapsedText,
} from "../shared/simulationState.js";
import { settings } from "../shared/settingsState.js";
import {
    getSystemInfo,
    getMultipleSystemsData
} from "../services/simulationServices.js";
import {
    calculateOrbitalPosition,
    calculateRotationMatrix,
    calculateMaxApoapsis,
    calculateCameraDistance,
    calculateViewRadius,
    calculateAverageNormal,
    calculateDefaultCameraPosition,
    calculateReferenceGridSquareSize,
} from "./simulationCalculations.js";
import { 
    updateCalendar, 
    formatSimulationDate, 
    getElapsedDaysText, 
} from "../ui/simulationCalendar.js";

let timer;

let currentSimulationTime; // The current simulation time in milliseconds since Unix epoch
let currentSystem;
let currentSystemColours;

let scene;
let camera;
let controls;
let renderer;
let labelRenderer;

const referenceSystemData = new Map(); // Cache for orbital data at the reference timestamp

// The default view radius in AU, calculated based on the maximum apoapsis.
let defaultViewRadius;

// Constants for camera and controls
const viewRadiusMultiplier = 1.2;
const objectSizeMultiplier = 0.002;

const fov = 45; // Field of view in degrees
const cameraNearMultiplier = 1;
const cameraFarMultiplier = 10;

const controlsMinMultiplier = 10;
const controlsMaxMultiplier = 1.5;
const controlsZoomSpeed = 2.5;

const cameraDefaults = {
    position: null, // Will be set based on the system's orbital data
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
    up: new THREE.Vector3(0, 0, 1), // Z-axis is up
};

const currentSystemGroup = new THREE.Group();
const solarSystemGroup = new THREE.Group();
solarSystemGroup.visible = false; // Initially hidden until the user requests a comparison

const objectMeshes = new Map();
const orbitalLines = new Map();
const objectLabels = new Map();

// Default size and colour of all the objects
let objectSize;
let objectScale = 1;
const objectColour = "white";

const orbitPoints = 360; // Number of points to approximate the ellipse

/**
 * The width (thickness) of the orbit lines for regular orbits and for orbits
 * belonging to the Solar System when it's shown only as a comparison overlay.
 */
const orbitLineWidth = 4;
const comparisonOrbitLineWidth = 2;

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
        referenceGrid: 0x333333,
    },
};

const habitableZoneSegments = 64; // Number of segments to approximate the ring
const habitableZoneColor = 0x00ff00; // Green
const habitableZoneOpacity = 0.2;
let habitableZone;
let habitableZoneMesh;

const referenceGridSquareSize = 1; // in AU, will be scaled based on the camera position
const numSquaresInViewRadius = 5;
const referenceGridSizeMultiplier = 50; // To ensure the grid extends beyond the view radius
const referenceGridSize = referenceGridSquareSize * numSquaresInViewRadius * referenceGridSizeMultiplier;

let referenceGrid;

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
        referenceSystemData.set(
            system,
            systemInfo["reference"]
        );
    }
    return referenceSystemData.get(system);
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
        const material = new THREE.MeshStandardMaterial({ color: objectColour });

        mesh = new THREE.Mesh(geometry, material);

        if (group === solarSystemGroup) {
            mesh.visible = !isObjectHidden("Solar System", name);
        } else {
            mesh.visible = !isObjectHidden(currentSystem, name);
        }

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
 * @param {boolean} [options.objectVisible] Whether the object should be visible
 * @returns {boolean} Whether the orbit should be visible
 */
function shouldShowOrbit(objectName, system = currentSystem, { orbitsVisible, objectVisible } = {}) {
    const areOrbitsShown = orbitsVisible ?? simulationState.orbitsShown;
    const isObjectShown = objectVisible ?? !isObjectHidden(system, objectName);

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
function getFadedColour(colour, opacity, isDarkMode = settings.isDarkMode) {
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
 * @param {Object} orbitalData Orbital data for the line
 * @param {THREE.Group} group The group to add the orbital line to
 * @param {string} colour CSS colour string used for this orbit's line
 */
function createOrUpdateOrbitalLine(name, orbitalData, group, colour) {
    const { a, e, inc, Omega, omega } = orbitalData;

    if (e === 1) return; // Parabolic orbits are not supported for now

    let line = orbitalLines.get(name);

    if (!line) {
        const canvas = renderer.domElement;
        const geometry = new LineGeometry();
        const material = new LineMaterial();

        if (group === solarSystemGroup) {
            const comparisonColour = getFadedColour(colour, comparisonOrbitOpacity);
            material.linewidth = comparisonOrbitLineWidth;
            material.color.set(comparisonColour);
        } else {
            material.linewidth = orbitLineWidth;
            material.color.set(colour);
        }

        material.resolution.set(canvas.clientWidth, canvas.clientHeight);

        line = new Line2(geometry, material);

        if (group === solarSystemGroup) {
            line.visible = shouldShowOrbit(name, "Solar System");
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

    const thetaStep = (thetaEnd - thetaStart) / orbitPoints;

    for (let theta = thetaStart; theta <= thetaEnd; theta += thetaStep) {
        const { x, y } = calculateOrbitalPosition(a, e, theta);
        points.push(x, y, 0);
    }

    if (e > 1) {
        // Add the last point at the end of the range to ensure the line reaches the asymptote
        const { x, y } = calculateOrbitalPosition(a, e, thetaEnd);
        points.push(x, y, 0);
    }

    // Create or update the position attribute of the line's geometry
    line.geometry.setPositions(points);

    // Rotate the line to match the orbital parameters
    const rotationMatrix = calculateRotationMatrix(Omega, inc, omega);
    line.quaternion.setFromRotationMatrix(rotationMatrix);
}

/**
 * Create a mesh representing the habitable zone of the current system.
 * The habitable zone is represented as a ring with a specified inner and outer radius.
 */
function createHabitableZoneMesh() {
    const startRadius = habitableZone.start;
    const endRadius = habitableZone.end;

    const geometry = new THREE.RingGeometry(startRadius, endRadius, habitableZoneSegments);
    const material = new THREE.MeshBasicMaterial({
        color: habitableZoneColor,
        opacity: habitableZoneOpacity,
        transparent: true,
        side: THREE.DoubleSide,
    });
    habitableZoneMesh = new THREE.Mesh(geometry, material);
    habitableZoneMesh.visible = simulationState.habitableZoneShown;
}

/**
 * Create a reference grid in the scene.
 * @param {number} defaultViewRadius The view radius of the current system to determine the grid size
 */
function createReferenceGrid(defaultViewRadius) {
    const referenceGridColor = getTheme().referenceGrid;
    referenceGrid = new THREE.GridHelper(
        referenceGridSize,
        referenceGridSize / referenceGridSquareSize
    );

    referenceGrid.material.color.set(referenceGridColor);
    referenceGrid.material.vertexColors = false; // Use a single colour for the grid lines
    referenceGrid.geometry.rotateX(Math.PI / 2); // Rotate the grid to lie in the XY plane
    referenceGrid.visible = simulationState.referenceGridShown;

    updateReferenceGridScale(defaultViewRadius);
}

/**
 * Update the positions of all objects in the current system.
 * Update the calendar to display the current simulation time.
 */
async function updateSimulation() {
    // Take comparingToSolarSystem at beginning of function call to prevent mid-function changes
    const isComparingToSolarSystem = comparingToSolarSystem;
    const isDarkMode = settings.darkMode;

    const systems = [currentSystem];
    if (isComparingToSolarSystem) {
        systems.push("Solar System");
    }
    const allSystemData = await getMultipleSystemsData(systems, currentSimulationTime);
    const currentSystemData = allSystemData[currentSystem];
    updateCalendar(currentSimulationTime);


    for (const [name, position] of Object.entries(currentSystemData.positions)) {
        createOrUpdateObjectMesh(name, position, currentSystemGroup, getCurrentSystemColour(name, isDarkMode));
    }
    for (const [name, orbitalData] of Object.entries(currentSystemData.orbital_data)) {
        createOrUpdateOrbitalLine(name, orbitalData, currentSystemGroup, getCurrentSystemColour(name, isDarkMode));
    }

    if (isComparingToSolarSystem) {
        const solarSystemData = allSystemData["Solar System"];
        const overlayColour = comparisonOverlayColour[isDarkMode ? "dark" : "light"];

        // The comparison overlay uses a single colour for every object label and orbit
        for (const [name, position] of Object.entries(solarSystemData.positions)) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateObjectMesh(name, position, solarSystemGroup, overlayColour);
        }
        for (const [name, orbitalData] of Object.entries(solarSystemData.orbital_data)) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateOrbitalLine(name, orbitalData, solarSystemGroup, overlayColour);
        }
    }
}

/**
 * Update the scale of the reference grid based on the view radius.
 * @param {number} viewRadius The radius of the view
 */
function updateReferenceGridScale(viewRadius) {
    const desiredSquareSize = calculateReferenceGridSquareSize(
        viewRadius,
        numSquaresInViewRadius
    );
    const referenceGridScale = desiredSquareSize / referenceGridSquareSize;
    referenceGrid.scale.set(referenceGridScale, referenceGridScale, referenceGridScale);
};

/**
 * Align the system's average normal with the up vector.
 * 
 * @param {THREE.Group} group The group to align
 * @param {THREE.Vector3} averageNormal The average normal vector of the system's orbital planes
 */
function alignSystemToCameraUp(group, averageNormal) {
    const quaternion = new THREE.Quaternion()
        .setFromUnitVectors(averageNormal, cameraDefaults.up);
    group.quaternion.copy(quaternion);
}

/**
 * Initialise the camera for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {number} defaultViewRadius The default radius of view to fit within the camera
 */
function initOrUpdateCamera(canvas, defaultViewRadius) {
    const defaultCameraDistance = calculateCameraDistance(fov, defaultViewRadius);
    cameraDefaults.position = calculateDefaultCameraPosition(
        cameraDefaults.up,
        defaultCameraDistance
    );

    const cameraNear = objectSize * cameraNearMultiplier;
    const cameraFar = defaultCameraDistance * cameraFarMultiplier;

    if (!camera) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        camera = new THREE.PerspectiveCamera(fov, aspect, cameraNear, cameraFar);
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
 * @param {number} defaultViewRadius The default radius of view to fit within the camera
 */
function initOrUpdateControls(canvas, defaultViewRadius) {
    const defaultCameraDistance = calculateCameraDistance(fov, defaultViewRadius);

    if (!controls) {
        controls = new OrbitControls(camera, canvas);
        controls.addEventListener("change", () => {
            limitCameraPan();
            const cameraDistanceToTarget = camera.position.distanceTo(controls.target);
            const viewRadius = calculateViewRadius(fov, cameraDistanceToTarget);
            updateReferenceGridScale(viewRadius);
        });
    }
    controls.target.copy(cameraDefaults.target);
    controls.minDistance = objectSize * controlsMinMultiplier; // Limit to avoid clipping the near plane
    controls.maxDistance = defaultCameraDistance * controlsMaxMultiplier; // Limit to avoid clipping the far plane
    controls.zoomSpeed = controlsZoomSpeed;
    controls.update();
}

/**
 * Limit the camera's pan to ensure it doesn't go beyond the maximum pan distance.
 * The maximum pan distance is set to the default view radius.
 */
function limitCameraPan() {
    const distanceToOrigin = controls.target.length();
    const maxPanDistance = defaultViewRadius;

    if (distanceToOrigin > maxPanDistance) {
        const directionToOrigin = controls.target
            .clone()
            .normalize();

        const newTargetPosition = directionToOrigin
            .multiplyScalar(maxPanDistance);
        controls.target.copy(newTargetPosition);
        controls.update();
    }
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
    labelRenderer.domElement.style.position = "absolute";
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
        Object.entries(systemInfo.objects ?? {}).map(([name, data]) => [name, data.colour])
    );

    const canvas = document.getElementById("simulation-canvas");
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    referenceSystemData.set( // Add this system's reference data to cache
        currentSystem,
        systemInfo["reference"]
    );

    const referenceDataForCurrentSystem = systemInfo["reference"];
    const orbitalDataValues = Object.values(referenceDataForCurrentSystem.orbital_data);

    const maxApoapsis = calculateMaxApoapsis(orbitalDataValues);

    defaultViewRadius = maxApoapsis * viewRadiusMultiplier; // Multiplier for padding
    objectSize = defaultViewRadius * objectSizeMultiplier;

    // Align the system's average normal with the up vector (Z-axis)
    const currentSystemAverageNormal = calculateAverageNormal(orbitalDataValues);
    alignSystemToCameraUp(currentSystemGroup, currentSystemAverageNormal);

    createHabitableZoneMesh();
    createReferenceGrid(defaultViewRadius);

    initOrUpdateCamera(canvas, defaultViewRadius);
    initOrUpdateControls(canvas, defaultViewRadius);
    initScene();
    initLabelRenderer(canvas);
    initTimer();

    /**
     * Persist the current simulation time, formatted simulation date, and days elapsed text 
     * before the simulation is exited
     */
    window.addEventListener("pagehide", () => {
        setSimulationTime(currentSystem, currentSimulationTime);
        
        const formattedSimulationDate = formatSimulationDate(currentSimulationTime);
        setFormattedSimulationDate(currentSystem, formattedSimulationDate);

        const elapsedDaysText = getElapsedDaysText(currentSimulationTime);
        setElapsedText(currentSystem, elapsedDaysText);
    });

    // Start rendering frames and updating the simulation
    updateSimulation();
    renderFrame();
}

export function stepForward() {
    currentSimulationTime += getSimulationSpeedMilliseconds();
    updateSimulation();
}

export function stepBack() {
    currentSimulationTime -= getSimulationSpeedMilliseconds();
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

export function resetView() {
    camera.position.copy(cameraDefaults.position);
    controls.target.copy(cameraDefaults.target); // Look at the barycenter
    controls.update();
}

export async function compareToSolarSystem() {
    const canvas = renderer.domElement;

    const referenceDataForCurrentSystem = await getReferenceSystemData(currentSystem);
    const referenceDataForSolarSystem = await getReferenceSystemData("Solar System");

    const currentOrbitalDataValues = Object.values(referenceDataForCurrentSystem.orbital_data);
    const solarOrbitalDataValues = Object.values(referenceDataForSolarSystem.orbital_data);

    const currentMaxApoapsis = calculateMaxApoapsis(currentOrbitalDataValues);
    const solarMaxApoapsis = calculateMaxApoapsis(solarOrbitalDataValues);

    const currentViewRadius = currentMaxApoapsis * viewRadiusMultiplier;
    const solarViewRadius = solarMaxApoapsis * viewRadiusMultiplier;
    defaultViewRadius = Math.max(currentViewRadius, solarViewRadius);

    // Scale objects for comparison as the smaller of the two sizes
    const currentSystemObjectSize = currentViewRadius * objectSizeMultiplier;
    const solarSystemObjectSize = solarViewRadius * objectSizeMultiplier;
    const comparisonObjectSize = Math.min(currentSystemObjectSize, solarSystemObjectSize);
    objectScale = comparisonObjectSize / objectSize;

    // Align the solar system's average normal with the up vector (Z-axis)
    const solarSystemAverageNormal = calculateAverageNormal(solarOrbitalDataValues);
    alignSystemToCameraUp(solarSystemGroup, solarSystemAverageNormal);

    solarSystemGroup.visible = true;

    initOrUpdateCamera(canvas, defaultViewRadius);
    initOrUpdateControls(canvas, defaultViewRadius);

    resetView();

    updateSimulation();
}

export async function hideSolarSystem() {
    objectScale = 1; // Reset object scale to default

    // Update the camera and controls to fit the current system again

    const canvas = renderer.domElement;

    const referenceDataForCurrentSystem = await getReferenceSystemData(currentSystem);
    const orbitalDataValues = Object.values(referenceDataForCurrentSystem.orbital_data);

    const maxApoapsis = calculateMaxApoapsis(orbitalDataValues);
    defaultViewRadius = maxApoapsis * viewRadiusMultiplier;

    solarSystemGroup.visible = false;

    initOrUpdateCamera(canvas, defaultViewRadius);
    initOrUpdateControls(canvas, defaultViewRadius);
    updateSimulation();
}

export function setHabitableZoneVisibility(value) {
    if (habitableZoneMesh) {
        habitableZoneMesh.visible = value;
    }
}

export function setLabelsVisibility(value) {
    for (const label of objectLabels.values()) {
        label.visible = value;
    }
}

export function setOrbitsVisibility(value) {
    for (const [name, orbit] of orbitalLines) {
        orbit.visible = shouldShowOrbit(
            name,
            currentSystem,
            { orbitsVisible: value }
        );
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
        orbit.visible = shouldShowOrbit(
            name,
            currentSystem,
            { objectVisible: value }
        );
    }
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
    const overlayColour = comparisonOverlayColour[isDarkMode ? "dark" : "light"];

    for (const [name, label] of objectLabels) {
        const mesh = objectMeshes.get(name);
        const isComparisonOverlay = mesh?.parent === solarSystemGroup;

        label.element.style.backgroundColor = labelBackground;
        label.element.style.color = isComparisonOverlay
            ? overlayColour
            : getCurrentSystemColour(name, isDarkMode);
    }

    const fadedOverlayColour = getFadedColour(overlayColour, comparisonOrbitOpacity, isDarkMode);

    for (const [name, orbit] of orbitalLines) {
        const isComparisonOverlay = orbit.parent === solarSystemGroup;

        orbit.material.color.set(
            isComparisonOverlay ? fadedOverlayColour : getCurrentSystemColour(name, isDarkMode)
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

        currentSimulationTime += getSimulationSpeedMilliseconds() * deltaTime;

        updateSimulation();
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    // Invoke render() on the next frame
    requestAnimationFrame(renderFrame);
}
