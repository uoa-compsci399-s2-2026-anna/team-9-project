import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as state from "../shared/simulationState.js";
import { getSystemData } from "../services/simulationServices.js";

let lastRenderTime = null;
let currentSimulationTime = 0;
let currentSystem;

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

    const fov = 45;
    const aspect = 2;
    const near = 0.01;
    const far = 500;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 35, 55);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.minDistance = near;
    controls.maxDistance = far;
    controls.update();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');
}

export async function render() {
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
    console.log(systemData);

    console.log(deltaTime);

    // Invoke render() on the next frame
    if (state.running) {
        requestAnimationFrame(render);
    }
}