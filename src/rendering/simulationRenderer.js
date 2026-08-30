import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import * as state from "../shared/simulationState.js";
import { getSystemData } from "../services/simulationServices.js";

let lastRenderTime = null;
let currentSimulationTime = 0;
let currentSystem;

let scene;
let camera;
let renderer;
let labelRenderer;

const objectMeshes = new Map();

// Default size and colour of all the objects
const objectSize = 0.05;
const objectColour = 0xFFFFFF; // White

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
    camera.position.set(0, 0, 50);

    // Avoid buggy behaviour when the camera is near the clipping plane
    const controlsMin = 1;
    const controlsMax = 100;
    const controlsZoomMultiplier = 2.5;

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0); // Look at the sun
    controls.minDistance = controlsMin; 
    controls.maxDistance = controlsMax;
    controls.zoomSpeed = controlsZoomMultiplier;
    controls.update();

    scene = new THREE.Scene();
    scene.background = new THREE.Color('black');
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.left = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement.appendChild(labelRenderer.domElement);
}

/**
 * If the target object does not exist, then its mesh is created at the given position.
 * If the target obect does exist, then its position is updated
 * 
 * @param {string} name Name of the object
 * @param {position} position Position of the object
 */
function createOrUpdateMesh(name, position) {
    let mesh = objectMeshes.get(name);

    if (!mesh) {
        const geometry = new THREE.SphereGeometry(objectSize);
        const material = new THREE.MeshStandardMaterial({ color: objectColour });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        objectMeshes.set(name, mesh);

        const labelDiv = document.createElement("div");
        labelDiv.className = "planet-label";
        labelDiv.textContent = name;
        labelDiv.style.color = "white";
        labelDiv.style.fontSize = "12px";
        labelDiv.style.textShadow = "0 0 3px black, 0 0 3px black";

        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 0, 0);
        mesh.add(label);
    }

    mesh.position.set(position.x, position.y, position.z);
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
 * TODO: Rendering on every animation frame leads to high CPU usage.
 */
export async function render() {
    resizeRendererToDisplaySize();

    if (lastRenderTime === null) {
        lastRenderTime = Date.now();
    }

    const currentTime = Date.now();
    // Measure the change in time in seconds
    const deltaTime = (currentTime - lastRenderTime) / 1000;

    lastRenderTime = currentTime;

    currentSimulationTime += state.simulationSpeed * deltaTime;

    // TODO: There is currently a massive delay on the first load. This will be addresed by the backend.
    // Fetch data for the current system
    const systemData = await getSystemData(currentSystem, currentSimulationTime);
    const positionMap = Object.entries(systemData.positions);
    for (const [name, position] of positionMap) {
        createOrUpdateMesh(name, position);
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    // Invoke render() on the next frame
    if (state.running) {
        requestAnimationFrame(render);
    }
}
