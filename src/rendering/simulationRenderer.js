import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as state from "../shared/simulationState.js";
import { getSystemData } from "../services/simulationServices.js";

let lastRenderTime = null;
let currentSimulationTime = 0;
let currentSystem;

let scene;
let camera;
let renderer;

const objectMeshes = new Map();

// Default size and colour of all the objects
const objectSize = 0.1;
const objectColour = 0xFFFFFF; // White

/**
 * Initialises the requested system to render
 * 
 * @param {string} name System name
 */
export function init(name) {
    currentSimulationTime = 0;
    currentSystem = name;
    console.log(name);

    const canvas = document.getElementById("simulation-canvas");
    // TODO: decide on AA or not
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

    const fov = 45;
    const aspect = 2;
    const near = 0.01;
    const far = 500;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 35, 55);

    const controls = new OrbitControls(camera, canvas);
    // TODO: consider controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.minDistance = near;
    controls.maxDistance = far;
    controls.update();

    scene = new THREE.Scene();
    scene.background = new THREE.Color('black');
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // TODO: use timer to avoid the simuation breaking when tabbing out (page visibility API)
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
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    return needResize;
}

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
    
    // TODO: currently rendering on every frame

    // TODO: There is currently a massive delay on the first load. This will be addresed by the backend.
    // Fetch data for the current system
    const systemData = await getSystemData(currentSystem, currentSimulationTime);
    const positionMap = Object.entries(systemData.positions);
    for (const [name, position] of positionMap) {
        createOrUpdateMesh(name, position);
    }
    console.log(systemData);
    console.log();

    console.log(deltaTime);

    renderer.render(scene, camera);

    // Invoke render() on the next frame
    if (state.running) {
        requestAnimationFrame(render);
    }
}