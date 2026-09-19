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
    calculateUpVector,
    calculateDefaultCameraPosition,
} from "./simulationCalculations.js";
import { 
    updateCalendar, 
    formatSimulationDate, 
    getElapsedDaysText, 
} from "../ui/simulationCalendar.js";

let timer;

// The current simulation time in milliseconds since Unix epoch
let currentSimulationTime;

let currentSystem;

let currentSystemColours;

let scene;
let camera;
let controls;
let renderer;
let labelRenderer;

// Stores whether the user is currently dragging the camera
let isDragging = false;

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
    },
    dark: {
        background: new THREE.Color("black"),
        labelBackground: "rgba(0, 0, 0, 0.5)",
    },
};

const habitableZoneSegments = 64; // Number of segments to approximate the ring
const habitableZoneColor = 0x00ff00; // Green
const habitableZoneOpacity = 0.2;
let habitableZone;
let habitableZoneMesh;

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
 * Get the name of the object of the closest clicked label
 * @param {*} event 
 * @returns 
 */
function getClickedLabel(event) {
    let closestName = null;
    let closestDistanceSquared = Infinity;

    for (const mesh of objectMeshes.values()) {
        // TODO: is this the most idiomatic way of doing this?
        // Get the label associated with the mesh
        const label = mesh.children.find(child => child instanceof CSS2DObject);
        if (!label) {
            continue;
        }

        // TODO: consider helper
        // Get the clickable area of the label in viewport coordinates
        const labelBoundingRect = label.element.getBoundingClientRect();
        const labelClicked =
            event.clientX >= labelBoundingRect.left &&
            event.clientX <= labelBoundingRect.right &&
            event.clientY >= labelBoundingRect.top &&
            event.clientY <= labelBoundingRect.bottom;

        if (!labelClicked) {
            continue;
        }

        const labelWorldPosition = new THREE.Vector3();
        mesh.getWorldPosition(labelWorldPosition);
        const labelDistanceSquared = camera.position.distanceToSquared(labelWorldPosition);

        if (labelDistanceSquared < closestDistanceSquared) {
            closestDistanceSquared = labelDistanceSquared;
            closestName = mesh.userData.name;
        }
    }

    return closestName;
}

// TODO: decide how the event will fire given that I am doing a lot of early returns
/**
 * (1) Check if the object itself was clicked
 * (2) Check if the object's label was clicked
 * (3) Check if the object's hitbox was clicked
 * 
 * @param {*} event 
 */
function onCanvasClick(event, canvas) {
    console.log("Clicked canvas!");

    const rect = canvas.getBoundingClientRect();

    // TODO: make helper
    const mouseCoordinates = new THREE.Vector2();

    // Raycaster only accepts NDC coordinates
    mouseCoordinates.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseCoordinates.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseCoordinates, camera);

    // Get all the meshes for all of the objects in the scene
    const meshes = Array.from(objectMeshes.values());

    // TODO: make magic value clearer?
    // Check if any parent meshes were clicked (excludes hitboxes)
    let intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
        // Get the nearest object intersected
        const hitmesh = intersects[0].object;
        const name = hitmesh.userData.name;

        console.log(name);

        return;
    }

    // Get the closest clicked label
    // TODO: I believe this can be rewritten to avoid that annoying bounding rectangle logic and just base it off being a child of the mesh?
    const labelName = getClickedLabel(event);
    if (labelName) {
        console.log("Label clicked");
        console.log(labelName);
        return;
    }

    // Check if any hitboxes were clicked (by checking children of objects)
    intersects = raycaster.intersectObjects(meshes, true);
    
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;

        // TODO: Do I have to set the name on the hitbox or can I access the parent directly?
        const name = hitMesh.userData.name;

        console.log("Hitbox clicked")
        console.log(name);

        return;
    }

    console.log("Nothing found");
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

        // Give the mesh a name to identify the mesh with raycasting
        mesh.userData.name = name;

        // Create a larger invisible sphere for click detection
        // TODO: multiplier is temporary for now. This should be additive and based on the current system (same for all objects as discussed in meeting).
        const hitboxSize = objectSize * 2;
        const hitboxGeometry = new THREE.SphereGeometry(hitboxSize);
        const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });

        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitbox.userData.name = name; // TODO: surely this could be managed by getting the parent of the hitbox and their name? As is done with labels

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
        const material = new LineMaterial({ color: colour });

        if (group === solarSystemGroup) {
            material.transparent = true;
            material.opacity = comparisonOrbitOpacity;
            material.linewidth = comparisonOrbitLineWidth;
        } else {
            material.linewidth = orbitLineWidth;
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

    // Rotate the habitable zone to align its normal with the camera's up vector
    const normal = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(normal, camera.up);
    habitableZoneMesh.quaternion.copy(quaternion);

    currentSystemGroup.add(habitableZoneMesh);
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

    // Detect when the user is moving the camera
    controls.addEventListener("change", () => {
        isDragging = true;
    });
}

/**
 * 
 * @param {*} canvas 
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
    const viewRadius = maxApoapsis * viewRadiusMultiplier; // Add some padding
    const upVector = calculateUpVector(orbitalDataValues);

    objectSize = viewRadius * objectSizeMultiplier; // Set the object size

    initOrUpdateCamera(canvas, viewRadius, upVector);
    initOrUpdateControls(canvas, viewRadius);
    initRaycastingEvents(canvas);
    initScene();
    initLabelRenderer(canvas);
    initTimer();

    createHabitableZoneMesh();

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

    for (const [name, orbit] of orbitalLines) {
        const isComparisonOverlay = orbit.parent === solarSystemGroup;

        orbit.material.color.set(
            isComparisonOverlay ? overlayColour : getCurrentSystemColour(name, isDarkMode)
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
