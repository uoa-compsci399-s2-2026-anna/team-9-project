import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { getSimulationSpeedSeconds, simulationState, running, frozen } from "../shared/simulationState.js";
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

const cameraDefaults = {
    position: new THREE.Vector3(0, 0, 50),
    target: new THREE.Vector3(0, 0, 0),
};

const objectMeshes = new Map();
const orbitalLines = new Map();
const objectLabels = new Map();

// Default size and colour of all the objects
const objectSize = 0.05;
const objectColour = "white";

const orbitPoints = 360; // Number of points to approximate the ellipse

// TODO: reorder defaults (maybe some sort of struct?)
const defaultFontSize = "12px";
const largerFontSize = "18px";

const defaultFontFamily = "inherit";
const openDyslexicFontFamily = "OpenDyslexic";

const lightBackground = new THREE.Color("white");
const darkBackground = new THREE.Color("black");

const lightModeLabelColour = "black";
const darkModeLabelColour = "white";

const lightModeTextShadow = "0 0 3px white";
const darkModeTextShadow = "0 0 3px black";

const lightModeOrbitColour = "black";
const darkModeOrbitColour = "white";

function getBackgroundColour(isDarkMode) {
    if (isDarkMode) {
        return darkBackground;
    } else {
        return lightBackground;
    }
}

function getFontColour(isDarkMode) {
    if (isDarkMode) {
        return darkModeLabelColour;
    } else {
        return lightModeLabelColour;
    }
}

function getFontSize(size) {
    if (size == "Larger") {
        return largerFontSize;
    } else {
        return defaultFontSize;
    }
}

function getFontFamily(chosenFont) {
    if (chosenFont == "OpenDyslexic") {
        return openDyslexicFontFamily;
    } else {
        return defaultFontFamily;
    }
}

function getTextShadow(isDarkMode) {
    if (isDarkMode) {
        return darkModeTextShadow;
    } else {
        return lightModeTextShadow;
    }
}

function getOrbitColour(isDarkMode) {
    if (isDarkMode) {
        return darkModeOrbitColour;
    } else {
        return lightModeOrbitColour;
    }
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
        mesh.visible = !simulationState.hiddenObjects[currentSystem].includes(name);
        scene.add(mesh);
        objectMeshes.set(name, mesh);

        const labelDiv = document.createElement("div");
        labelDiv.className = "planet-label";
        labelDiv.textContent = name;
        labelDiv.style.color = getFontColour(settings.darkMode);
        labelDiv.style.fontSize = getFontSize(settings.textSize);
        labelDiv.style.fontFamily = getFontFamily(settings.font);
        labelDiv.style.textShadow = getTextShadow(settings.darkMode);

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 0, 0);
        label.visible = simulationState.labelsShown;
        mesh.add(label);
        objectLabels.set(name, label);
    }

    mesh.position.set(position.x, position.y, position.z);
}

/**
 * If the target orbit does not exist, then its orbital line is created with the given orbital data.
 * If the target orbital line does exist, then it is updated.
 * 
 * @param {string} name Name of the orbital line
 * @param {Object} orbitalData Orbital data for the line
 */
function createOrUpdateOrbitalLine(name, orbitalData) {
    let line = orbitalLines.get(name);

    const { a, e, inc, Omega, omega } = orbitalData;

    if (!line) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: getOrbitColour(settings.darkMode) });
        line = new THREE.LineLoop(geometry, material);
        line.visible = simulationState.orbitsShown;

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
 * Update the positions of all objects in the current system based on 
 * the current simulation time.
 */
async function updateSimulation() {
    // Fetch data for the current system
    const systemData = await getSystemData(currentSystem, currentSimulationTime);
    const positionMap = Object.entries(systemData.positions);
    const orbitalDataMap = Object.entries(systemData.orbital_data);

    for (const [name, position] of positionMap) {
        createOrUpdateObjectMesh(name, position);
    }
    for (const [name, orbitalData] of orbitalDataMap) {
        createOrUpdateOrbitalLine(name, orbitalData);
    }
}

/**
 * Initialises the requested system to render
 * 
 * @param {string} name System name
 */
export function init(name) {
    currentSimulationTime = 0;
    currentSystem = name;

    const canvas = document.getElementById("simulation-canvas");

    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    const fov = 45;
    const aspect = 2;
    const cameraNear = 0.01;
    const cameraFar = 200;
    camera = new THREE.PerspectiveCamera(fov, aspect, cameraNear, cameraFar);
    camera.up.set(0, 0, 1); // Orbital plane is X-Y (Z is up)
    camera.position.copy(cameraDefaults.position);

    // Avoid buggy behaviour when the camera is near the clipping plane
    const controlsMin = 1;
    const controlsMax = 100;
    const controlsZoomMultiplier = 2.5;

    controls = new OrbitControls(camera, canvas);
    controls.target.copy(cameraDefaults.target); // Look at the sun
    controls.minDistance = controlsMin; 
    controls.maxDistance = controlsMax;
    controls.zoomSpeed = controlsZoomMultiplier;
    controls.update();

    scene = new THREE.Scene();
    scene.background = getBackgroundColour(settings.darkMode);
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
    updateSimulation();
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
    for (const orbit of orbitalLines.values()) {
        orbit.visible = value;
    }
}

export function setObjectVisibility(name, value) {
    const mesh = objectMeshes.get(name);

    if (mesh) {
        mesh.visible = value;
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
    scene.background = getBackgroundColour(settings.darkMode);

    let labelColour = getFontColour(isDarkMode);
    let labelTextShadow = getTextShadow(isDarkMode);
    for (const label of objectLabels.values()) {
        label.element.style.color = labelColour;
        label.element.style.textShadow = labelTextShadow;
    }

    let orbitColour = getOrbitColour(isDarkMode);
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
