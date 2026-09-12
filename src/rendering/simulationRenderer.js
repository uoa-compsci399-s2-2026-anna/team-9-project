import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
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
} from "../shared/simulationState.js";
import { settings } from "../shared/settingsState.js";
import { getSystemData } from "../services/simulationServices.js";
import {
    calculateOrbitalPosition,
    calculateRotationMatrix,
    calculateMaxApoapsis,
    calculateCameraDistance,
    calculateUpVector,
    calculateDefaultCameraPosition,
} from "./simulationCalculations.js";
import { updateCalendar } from "../ui/calendar.js";

let timer;

// The current simulation time in milliseconds since Unix epoch
let currentSimulationTime;

let currentSystem;

let scene;
let camera;
let controls;
let renderer;
let labelRenderer;

// Camera settings are calculated using orbital data at the reference timestamp.
// TODO: Backend endpoint for getting reference system data,
// which will be at the initial BJD_TDB of each system.
const referenceTimestamp = 1767225600000; // 2026-01-01 00:00:00 UTC in ms
const referenceSystemData = new Map(); // Cache for orbital data at the reference timestamp

// Constants for camera and controls
const viewRadiusMultiplier = 1.2;
const objectSizeMultiplier = 0.002;

const fov = 45; // Field of view in degrees
const cameraNearMultiplier = 1;
const cameraFarMultiplier = 3;

const controlsMinMultiplier = 10;
const controlsMaxMultiplier = 1.5;
const controlsZoomSpeed = 2.5;

const cameraDefaults = {
    position: null, // Will be set based on the system's orbital data
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
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
        labelColour: "black",
        textShadow: "0 0 3px white",
        orbitColour: "black",
    },
    dark: {
        background: new THREE.Color("black"),
        labelColour: "white",
        textShadow: "0 0 3px black",
        orbitColour: "white",
    },
};

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
        referenceSystemData.set(
            system,
            await getSystemData(system, referenceTimestamp)
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
 */
function createOrUpdateObjectMesh(name, position, group) {
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
        labelDiv.style.color = getTheme().labelColour;
        labelDiv.style.fontSize = getFontSize(settings.textSize);
        labelDiv.style.fontFamily = getFontFamily(settings.font);
        labelDiv.style.textShadow = getTheme().textShadow;

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
 * If the target orbit does not exist, then its orbital line is created with the given orbital data.
 * If the target orbital line does exist, then it is updated.
 * 
 * @param {string} name Name of the object associated with the orbital line
 * @param {Object} orbitalData Orbital data for the line
 * @param {THREE.Group} group The group to add the orbital line to
 */
function createOrUpdateOrbitalLine(name, orbitalData, group) {
    let line = orbitalLines.get(name);

    const { a, e, inc, Omega, omega } = orbitalData;

    if (!line) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: getTheme().orbitColour });
        line = new THREE.LineLoop(geometry, material);

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
    for (let i = 0; i < orbitPoints; i++) {
        const theta = (i / orbitPoints) * 2 * Math.PI;
        const { x, y } = calculateOrbitalPosition(a, e, theta);
        points.push(x, y, 0);
    }

    // Create or update the position attribute of the line's geometry
    const geometry = line.geometry;
    const position = geometry.getAttribute("position");
    if (!position) {
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(points, 3)
        );
    } else {
        position.array.set(points);
        position.needsUpdate = true;
    }

    // Rotate the line to match the orbital parameters
    const rotationMatrix = calculateRotationMatrix(Omega, inc, omega);
    line.quaternion.setFromRotationMatrix(rotationMatrix);
}

/**
 * Update the positions of all objects in the current system.
 * Update the calendar to display the current simulation time.
 */
async function updateSimulation() {
    updateCalendar(currentSimulationTime);

    const currentSystemData = await getSystemData(currentSystem, currentSimulationTime);

    for (const [name, position] of Object.entries(currentSystemData.positions)) {
        createOrUpdateObjectMesh(name, position, currentSystemGroup);
    }
    for (const [name, orbitalData] of Object.entries(currentSystemData.orbital_data)) {
        createOrUpdateOrbitalLine(name, orbitalData, currentSystemGroup);
    }

    if (comparingToSolarSystem) {
        const solarSystemData = await getSystemData("Solar System", currentSimulationTime);

        for (const [name, position] of Object.entries(solarSystemData.positions)) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateObjectMesh(name, position, solarSystemGroup);
        }
        for (const [name, orbitalData] of Object.entries(solarSystemData.orbital_data)) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateOrbitalLine(name, orbitalData, solarSystemGroup);
        }
    }
}

/**
 * Initialise the camera for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {number} viewRadius The radius of view to fit within the camera
 * @param {THREE.Vector3} upVector The up vector for the camera
 */
function initOrUpdateCamera(canvas, viewRadius, upVector) {
    const cameraDistance = calculateCameraDistance(fov, viewRadius);
    cameraDefaults.position = calculateDefaultCameraPosition(
        upVector,
        cameraDistance
    );

    const cameraNear = objectSize * cameraNearMultiplier;
    const cameraFar = cameraDistance * cameraFarMultiplier;

    if (!camera) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        camera = new THREE.PerspectiveCamera(fov, aspect, cameraNear, cameraFar);
        camera.up.copy(upVector); // Stays fixed for the current system
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
 * @param {number} viewRadius The radius of view to fit within the camera
 */
function initOrUpdateControls(canvas, viewRadius) {
    const cameraDistance = calculateCameraDistance(fov, viewRadius);

    if (!controls) {
        controls = new OrbitControls(camera, canvas);
    }
    controls.target.copy(cameraDefaults.target);
    controls.minDistance = objectSize * controlsMinMultiplier; // Limit to avoid clipping the near plane
    controls.maxDistance = cameraDistance * controlsMaxMultiplier; // Limit to avoid clipping the far plane
    controls.zoomSpeed = controlsZoomSpeed;
    controls.update();
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

    const canvas = document.getElementById("simulation-canvas");
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    const referenceDataForCurrentSystem = await getReferenceSystemData(currentSystem);
    const orbitalDataValues = Object.values(referenceDataForCurrentSystem.orbital_data);

    const maxApoapsis = calculateMaxApoapsis(orbitalDataValues);
    const viewRadius = maxApoapsis * viewRadiusMultiplier; // Add some padding
    const upVector = calculateUpVector(orbitalDataValues);

    objectSize = viewRadius * objectSizeMultiplier; // Set the object size
    initOrUpdateCamera(canvas, viewRadius, upVector);
    initOrUpdateControls(canvas, viewRadius);
    initScene();
    initLabelRenderer(canvas);
    initTimer();

    // Persist the current simulation time before the simulation is exited
    window.addEventListener("pagehide", () => setSimulationTime(currentSystem, currentSimulationTime));

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
    controls.target.copy(cameraDefaults.target); // Look at the sun
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
    const viewRadius = Math.max(currentViewRadius, solarViewRadius);

    // Scale objects for comparison as the smaller of the two sizes
    const currentSystemObjectSize = currentViewRadius * objectSizeMultiplier;
    const solarSystemObjectSize = solarViewRadius * objectSizeMultiplier;
    const comparisonObjectSize = Math.min(currentSystemObjectSize, solarSystemObjectSize);
    objectScale = comparisonObjectSize / objectSize;

    // Rotate solar system to align with the current system's up vector
    const solarUpVector = calculateUpVector(solarOrbitalDataValues);
    const solarToCurrentQuaternion = new THREE.Quaternion().setFromUnitVectors(solarUpVector, camera.up);
    solarSystemGroup.quaternion.copy(solarToCurrentQuaternion);

    solarSystemGroup.visible = true;

    initOrUpdateCamera(canvas, viewRadius, camera.up);
    initOrUpdateControls(canvas, viewRadius);

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
    const viewRadius = maxApoapsis * viewRadiusMultiplier;

    solarSystemGroup.visible = false;

    initOrUpdateCamera(canvas, viewRadius, camera.up);
    initOrUpdateControls(canvas, viewRadius);
    updateSimulation();
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
    scene.background = getTheme(isDarkMode).background;

    let labelColour = getTheme(isDarkMode).labelColour;
    let labelTextShadow = getTheme(isDarkMode).textShadow;
    for (const label of objectLabels.values()) {
        label.element.style.color = labelColour;
        label.element.style.textShadow = labelTextShadow;
    }

    let orbitColour = getTheme(isDarkMode).orbitColour;
    for (const orbit of orbitalLines.values()) {
        orbit.material.color.set(orbitColour);
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
