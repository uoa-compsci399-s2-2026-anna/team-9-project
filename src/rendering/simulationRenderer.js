import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { running, frozen, simulationSpeed } from "../shared/simulationState.js";
import { getSystemData } from "../services/simulationServices.js";

let timer;
let currentSimulationTime = 0;
let currentSystem;

let scene;
let camera;
let renderer;
let labelRenderer;

const objectMeshes = new Map();
const orbitalLines = new Map();

// Default size and colour of all the objects
const objectSize = 0.05;
const objectColour = 0xFFFFFF; // White

const orbitPoints = 360; // Number of points to approximate the ellipse
const orbitColour = 0xFFFFFF; // White

/**
 * If the target object does not exist, then its mesh is created at the given position.
 * If the target obect does exist, then its position is updated
 * 
 * @param {string} name Name of the object
 * @param {position} position Position of the object
 */
function createOrUpdateObjectMesh(name, position) {
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
 * If the target orbit does not exist, then its orbital line is created with the given orbital data.
 * If the target orbital line does exist, then it is updated.
 * 
 * @param {string} name Name of the orbital line
 * @param {orbitalData} orbitalData Orbital data for the line
 */
function createOrUpdateOrbitalLine(name, orbitalData) {
    let line = orbitalLines.get(name);

    const a = orbitalData.a;
    const e = orbitalData.e;
    const inc = orbitalData.inc;
    const Omega = orbitalData.Omega;
    const omega = orbitalData.omega;

    if (!line) {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ color: orbitColour });
        line = new THREE.LineLoop(geometry, material);

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
    const position = geometry.getAttribute('position');
    if (!position) {
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(points, 3)
        );
    } else {
        position.array.set(points);
        position.needsUpdate = true;
    }

    // Use Euler angles to rotate the line to match the orbital parameters
    // R = Rz(Omega) * Rx(inc) * Rz(omega)

    const eulerOmega = new THREE.Euler(0, 0, Omega, 'XYZ');
    const eulerInc = new THREE.Euler(inc, 0, 0, 'XYZ');
    const euleromega = new THREE.Euler(0, 0, omega, 'XYZ');

    const rotateOmega = new THREE.Matrix4().makeRotationFromEuler(eulerOmega);
    const rotateInc   = new THREE.Matrix4().makeRotationFromEuler(eulerInc);
    const rotateomega = new THREE.Matrix4().makeRotationFromEuler(euleromega);

    const rotationMatrix = new THREE.Matrix4()
        .multiplyMatrices(rotateOmega, rotateInc)
        .multiply(rotateomega);

    line.rotation.set(0, 0, 0); // Reset rotation
    line.applyMatrix4(rotationMatrix);
};

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

    // TODO: There is currently a massive delay on the first load. This will be addresed by the backend.
    // Render the system at t=0 (fetch the system data from the backend and display initial positions)
    updateSimulation();
    timer = new THREE.Timer();
    timer.connect(document); // Use Page Visibility API

    // Start rendering frames and updating the simulation
    renderFrame();
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

        currentSimulationTime += simulationSpeed * deltaTime;

        updateSimulation();
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    // Invoke render() on the next frame
    requestAnimationFrame(renderFrame);
}
