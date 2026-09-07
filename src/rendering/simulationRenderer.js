import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import {
    simulationState,
    running,
    frozen,
    isObjectHidden,
    getSimulationSpeedSeconds,
} from "../shared/simulationState.js";
import { settings } from "../shared/settingsState.js";
import { getSystemData } from "../services/simulationServices.js";

let timer;
let currentSimulationTime = 0;
let currentSystem;

let scene;
let camera;
let controls;
let renderer;
let labelRenderer;

// Constants for camera and controls
const viewRadiusMultiplier = 1.5;
const objectSizeMultiplier = 0.003;

const fov = 45; // Field of view in degrees
const cameraNear = 0.01;
const cameraFarMultiplier = 3;

const controlsMin = 0.02; // Limit to avoid clipping the near plane
const controlsMaxMultiplier = 2; // Limit to avoid clipping the far plane
const controlsZoomSpeed = 2.5;

const cameraDefaults = {
    position: null,
    target: new THREE.Vector3(0, 0, 0), // Look at the barycenter
};

const objectMeshes = new Map();
const orbitalLines = new Map();
const objectLabels = new Map();

// Default size and colour of all the objects
let objectSize;
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
 * If the target object does not exist, then its mesh is created at the given position.
 * If the target object does exist, then its position is updated.
 * 
 * @param {string} name Name of the object
 * @param {Object} position Position of the object
 */
function createOrUpdateObjectMesh(name, position) {
    let mesh = objectMeshes.get(name);

    if (!mesh) {
        const geometry = new THREE.SphereGeometry(objectSize);
        const material = new THREE.MeshStandardMaterial({ color: objectColour });

        mesh = new THREE.Mesh(geometry, material);
        mesh.visible = !isObjectHidden(currentSystem, name);
        scene.add(mesh);
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
 * @param {Object} [options] Visibility values
 * @param {boolean} [options.orbitsVisible] Whether orbits are visible
 * @param {boolean} [options.objectVisible] Whether the object should be visible
 * @returns {boolean} Whether the orbit should be visible
 */
function shouldShowOrbit(objectName, { orbitsVisible, objectVisible } = {}) {
    const areOrbitsShown = orbitsVisible ?? simulationState.orbitsShown;
    const isObjectShown = objectVisible ?? !isObjectHidden(currentSystem, objectName);

    return areOrbitsShown && isObjectShown;
}

/**
 * If the target orbit does not exist, then its orbital line is created with the given orbital data.
 * If the target orbital line does exist, then it is updated.
 * 
 * @param {string} name Name of the object associated with the orbital line
 * @param {Object} orbitalData Orbital data for the line
 */
function createOrUpdateOrbitalLine(name, orbitalData) {
    let line = orbitalLines.get(name);

    const { a, e, inc, Omega, omega } = orbitalData;

    if (!line) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: getTheme().orbitColour });
        line = new THREE.LineLoop(geometry, material);
        line.visible = shouldShowOrbit(name);

        scene.add(line);
        orbitalLines.set(name, line);
    }

    // Update the geometry of the line to match the orbital parameters
    const points = [];
    for (let i = 0; i < orbitPoints; i++) {
        const theta = (i / orbitPoints) * 2 * Math.PI;

        // Calculate the Cartesian position of the point on the ellipse using the polar equation
        const r = (a * (1 - e**2)) / (1 + e*Math.cos(theta));
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
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
    // R = Rz(Omega) * Rx(inc) * Rz(omega)

    const rotateAscendingNode = new THREE.Matrix4().makeRotationZ(Omega);
    const rotateInclination = new THREE.Matrix4().makeRotationX(inc);
    const rotatePeriapsis = new THREE.Matrix4().makeRotationZ(omega);

    const rotationMatrix = new THREE.Matrix4()
        .multiplyMatrices(rotateAscendingNode, rotateInclination)
        .multiply(rotatePeriapsis);

    line.quaternion.setFromRotationMatrix(rotationMatrix);
}

/**
 * Update the positions of all objects in the current system.
 * If the system data is not provided, it will be fetched from the backend.
 * 
 * @param {Object} [systemData] Optional system data to use for the update
 */
async function updateSimulation(systemData = null) {
    // Fetch data for the current system and current simulation time if not provided
    if (!systemData) {
        systemData = await getSystemData(currentSystem, currentSimulationTime);
    }

    for (const [name, position] of Object.entries(systemData.positions)) {
        createOrUpdateObjectMesh(name, position);
    }
    for (const [name, orbitalData] of Object.entries(systemData.orbital_data)) {
        createOrUpdateOrbitalLine(name, orbitalData);
    }
}

function calculateCameraDistance(viewRadius) {
    const fovRad = fov * (Math.PI / 180);
    return viewRadius / Math.tan(fovRad / 2); // Calculate the distance to fit the view radius
}

function calculateUpVector(orbitalDataValues) {
    const averageNormal = new THREE.Vector3();

    for (const { inc, Omega } of orbitalDataValues) {
        const normal = new THREE.Vector3( // Normal vector of the orbital plane
            Math.sin(inc) * Math.sin(Omega),
            -Math.sin(inc) * Math.cos(Omega),
            Math.cos(inc)
        );

        if (normal.z < 0) { // Ensure the normal vector points upwards
            normal.negate();
        }

        averageNormal.add(normal);
    }

    return averageNormal.normalize();
}

/**
 * Initialise the camera and controls for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 * @param {number} cameraDistance The distance of the camera from the target
 * @param {THREE.Vector3} upVector The up vector for the camera
 */
function initCameraAndControls(canvas, cameraDistance, upVector) {
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const cameraFar = cameraDistance * cameraFarMultiplier;
    camera = new THREE.PerspectiveCamera(fov, aspect, cameraNear, cameraFar);
    camera.up.copy(upVector);
    camera.position.copy(cameraDefaults.position);

    controls = new OrbitControls(camera, canvas);
    controls.target.copy(cameraDefaults.target);
    controls.minDistance = controlsMin; // Limit to avoid clipping the near plane
    controls.maxDistance = cameraDistance * controlsMaxMultiplier; // Limit to avoid clipping the far plane
    controls.zoomSpeed = controlsZoomSpeed;
    controls.update();
}

/**
 * Initialises the requested system to render
 * 
 * @param {string} name System name
 */
export async function init(name) {
    const canvas = document.getElementById("simulation-canvas");
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    currentSimulationTime = 0;
    currentSystem = name;

    const systemData = await getSystemData(currentSystem, currentSimulationTime);
    const orbitalDataValues = Object.values(systemData.orbital_data);

    const maxApoapsis = Math.max(
        ...orbitalDataValues.map(
            ({ a, e }) => a * (1 + e)
        )
    );
    const viewRadius = maxApoapsis * viewRadiusMultiplier; // Add some padding
    objectSize = maxApoapsis * objectSizeMultiplier;

    const cameraDistance = calculateCameraDistance(viewRadius);
    const upVector = calculateUpVector(orbitalDataValues);
    cameraDefaults.position = upVector.clone().multiplyScalar(cameraDistance);
    initCameraAndControls(canvas, cameraDistance, upVector);

    scene = new THREE.Scene();
    scene.background = getTheme().background;
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.left = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement.appendChild(labelRenderer.domElement);

    // TODO: There is currently a massive delay on the first load. This will be addresed by the backend.
    // Render the system at t=0 (fetch the system data from the backend and display initial positions)
    updateSimulation(systemData);
    timer = new THREE.Timer();
    timer.connect(document); // Use Page Visibility API

    // Start rendering frames and updating the simulation
    renderFrame();
}

export function stepForward() {
    currentSimulationTime += getSimulationSpeedSeconds();
    updateSimulation();
}

export function stepBack() {
    currentSimulationTime -= getSimulationSpeedSeconds();
    updateSimulation();
}

export function resetView() {
    camera.position.copy(cameraDefaults.position);
    controls.target.copy(cameraDefaults.target); // Look at the sun
    controls.update();
}

export function setLabelsVisibility(value) {
    for (const label of objectLabels.values()) {
        label.visible = value;
    }
}

export function setOrbitsVisibility(value) {
    for (const [name, orbit] of orbitalLines) {
        orbit.visible = shouldShowOrbit(name, { orbitsVisible: value });
    }
}

export function setObjectVisibility(name, value) {
    const mesh = objectMeshes.get(name);
    if (mesh) {
        mesh.visible = value;
    }

    const orbit = orbitalLines.get(name);
    if (orbit) {
        orbit.visible = shouldShowOrbit(name, { objectVisible: value });
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

        currentSimulationTime += getSimulationSpeedSeconds() * deltaTime;

        updateSimulation();
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    // Invoke render() on the next frame
    requestAnimationFrame(renderFrame);
}
