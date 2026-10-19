import * as THREE from "three";
import { MeshLineGeometry, MeshLineMaterial } from "three.meshline";
import {
    simulationState,
    running,
    frozen,
    comparingToSolarSystem,
    isObjectHiddenByDefault,
    getSimulationSpeedMilliseconds,
    getSimulationTime,
    setSimulationTime,
    setElapsedText,
} from "../shared/simulationState.js";
import { settings } from "../shared/settingsState.js";
import {
    getSystemInfo,
    getMultipleSystemsData,
} from "../services/simulationServices.js";
import {
    TWO_PI,
    calculateOrbitalPosition,
    isAngleBetween,
    calculateProgressDistance,
    calculateOrbitRotationMatrix,
    calculateApoapsis,
    calculateAverageNormal,
} from "./calculations.js";
import {
    renderer,
    labelRenderer,
    initRenderer,
    initLabelRenderer,
} from "./renderers.js";
import {
    cameraDefaults,
    cameraAnimationState,
    camera,
    controls,
    calculateCameraAndControlsSettings,
    initOrUpdateCamera,
    initOrUpdateControls,
    animateCamera,
    animateCameraToFitRadius,
} from "./cameraAndControls.js";
import {
    viewRadius,
    VIEW_RADIUS_MULTIPLIER,
    updateViewRadius,
    setDefaultViewRadii,
} from "./viewRadius.js";
import {
    scene,
    currentSystemGroup,
    solarSystemGroup,
    objectMeshes,
    orbitalLines,
    objectLabels,
    initScene,
} from "./scene/scene.js";
import {
    setReferenceSystemData,
    getVisibleReferenceOrbitalDataValues,
} from "./referenceSystemData.js";
import {
    objectSize,
    objectTypes,
    setObjectSize,
    getCurrentSystemColour,
    setCurrentSystemColours,
    setObjectTypes,
    updateInnermostPeriapsis,
} from "./objectProperties.js";
import {
    createGlowTexture,
    updateScreenSpaceScales,
    createOrUpdateObjectMesh,
} from "./scene/objects.js";
import { updateObjectLabelOffsets } from "./scene/objectLabels.js";
import {
    ORBIT_POINTS_COUNT,
    ORBIT_LINE_WIDTH_MODULATION_FUNCTION,
    shouldShowOrbit,
    getOrbitLineWidth,
    createOpaqueOrbitAlphaTexture,
    updateOrbitAlphaTexture,
} from "./scene/orbits.js";
import {
    habitableZone,
    habitableZoneMesh,
    updateHabitableZoneTexture,
    flipHabitableZoneTexture,
} from "./scene/habitableZone.js";
import {
    referenceGrid,
    updateReferenceGridScale,
} from "./scene/referenceGrid.js";
import {
    updateCalendar,
    getElapsedDaysText,
} from "../ui/simulationCalendar.js";
import {
    getTheme,
    getFontSize,
    getFontFamily,
    getFadedColour,
} from "./themes.js";
import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { MIN_SIMULATION_TIME, MAX_SIMULATION_TIME } from "../utils/utils.js";

let timer;

// The current simulation time in milliseconds since Unix epoch
let currentSimulationTime;
let lastFetchedSimulationTime = null; // The simulation time for which the last system data was fetched

let currentSystem;

let gettingSystemData = false; // Flag to prevent multiple concurrent backend requests
let lastSystemData = null;

const DRAG_THRESHOLD = 5;

const raycaster = new THREE.Raycaster();

const comparisonOrbitOpacity = 0.8;

// Last known pointer position (in viewport coordinates)
let pointerPosition = null;

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
 * Handles when the canvas is clicked on while the user is not moving the camera.
 * Detects if an object was clicked and, if so, fires an event to notify other components
 * that an object was clicked.
 *
 * @param {MouseEvent} event The click event
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 * @return Whether or not an object was clicked
 */
function onCanvasClick(event, canvas) {
    // Close any open object information panel
    bus.publish(EVENTS.SIM.CLOSE_OBJECT_INFO);

    const name = getObjectNameAt(event.clientX, event.clientY, canvas);

    if (!name) {
        return false;
    }

    bus.publish(EVENTS.SIM.OBJECT_CLICK, { objectName: name });
    return true;
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
    // Don't create orbital line in the comparison overlay
    // for objects that are hidden by default in the Solar System
    if (
        comparingToSolarSystem &&
        group === solarSystemGroup &&
        isObjectHiddenByDefault("Solar System", name)
    ) {
        return;
    }

    const { a, e, inc, Omega, omega, f } = orbitalData;

    if (e === 1) return; // Parabolic orbits are not supported for now

    const isElliptical = e < 1;

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

            material.lineWidth = getOrbitLineWidth(true);
            material.color.set(comparisonColour);
        } else {
            material.lineWidth = getOrbitLineWidth(false);
            material.color.set(colour);
        }

        material.alphaMap = createOpaqueOrbitAlphaTexture();
        material.useAlphaMap = 1;

        material.resolution.set(canvas.clientWidth, canvas.clientHeight);

        line = new THREE.Mesh(geometry, material);

        // Render above habitable zone to prevent z fighting
        line.renderOrder = 1;

        if (group === solarSystemGroup) {
            line.visible = comparingToSolarSystem;
        } else {
            line.visible = shouldShowOrbit(name, currentSystem);
        }

        group.add(line);
        orbitalLines.set(name, line);
    }

    // Update the geometry of the line to match the orbital parameters
    const points = [];
    let thetaStart = 0;
    let thetaEnd = TWO_PI;

    // Limit the angle range for hyperbolic orbits to its asymptotes
    if (!isElliptical) {
        const thetaLimit = Math.acos(-1 / e);
        const epsilon = 1e-10; // Avoid rendering issues at the asymptotes

        thetaStart = -thetaLimit + epsilon;
        thetaEnd = thetaLimit - epsilon;
    }

    // Calculate the step size for theta.
    // ORBIT_POINTS_COUNT - 2 is used as:
    // * A point is added at the object's position
    // * The last point is added separately
    const thetaStep = (thetaEnd - thetaStart) / (ORBIT_POINTS_COUNT - 2);

    let objectIndex = 0;
    for (let i = 0; i < ORBIT_POINTS_COUNT - 2; i++) {
        const theta = thetaStart + i * thetaStep;
        const { x, y } = calculateOrbitalPosition(a, e, theta);
        points.push(x, y, 0);

        if (isAngleBetween(f, theta, theta + thetaStep)) {
            // Add a point on the exact coordinates of the object to prevent
            // sampling issues where the object's position falls between points.
            const { x, y } = calculateOrbitalPosition(a, e, f);
            points.push(x, y, 0);
            objectIndex = i + 1;
        }
    }

    // Add the last point at the end of the range
    const { x, y } = calculateOrbitalPosition(a, e, thetaEnd);
    points.push(x, y, 0);

    /**
     * Proportion of a full revolution the object is from its starting
     * point/angle.
     */
    const objectProgress = objectIndex / (ORBIT_POINTS_COUNT - 1);

    updateOrbitAlphaTexture(
        line.material.alphaMap,
        objectProgress,
        isElliptical,
    );

    // Create or update the position attribute and widen the line at the object
    line.geometry.setPoints(points, (progress) => {
        /**
         * setPoints takes a callback which has a `progress` parameter which defines
         * the progress across the line (as a proportion, in [0, 1]), and returns
         * the PROPORTION of the original line width as defined for the material
         * to define the line width at that point (`progress`) along the line.
         */

        const FULL_WIDTH_PROPORTION = 1;

        if (settings.orbitLines == "Solid") {
            return FULL_WIDTH_PROPORTION;
        }

        const distance = calculateProgressDistance(
            progress,
            objectProgress,
            isElliptical,
        );

        if (settings.orbitLines === "Tapered") {
            return ORBIT_LINE_WIDTH_MODULATION_FUNCTION(distance);
        } else {
            return FULL_WIDTH_PROPORTION;
        }
    });

    // Rotate the line to match the orbital parameters
    const rotationMatrix = calculateOrbitRotationMatrix(Omega, inc, omega);
    line.quaternion.setFromRotationMatrix(rotationMatrix);
}

bus.subscribe(EVENTS.SETTINGS.ORBIT_LINES_SELECT, () => {
    // Update simulation to redraw orbit lines with new width/opacity profile
    updateSimulation();
});

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

    let allSystemData;

    if (gettingSystemData && lastSystemData) {
        // Use the last fetched data if a request is already in progress
        allSystemData = lastSystemData;
    } else {
        gettingSystemData = true;
        lastFetchedSimulationTime = currentSimulationTime;
        allSystemData = await getMultipleSystemsData(
            systems,
            lastFetchedSimulationTime,
        );
        updateCalendar(lastFetchedSimulationTime, forceCalendarUpdate);
        gettingSystemData = false;
        lastSystemData = allSystemData;
    }

    const currentSystemData = allSystemData[currentSystem];

    for (const [name, position] of Object.entries(
        currentSystemData.positions,
    )) {
        createOrUpdateObjectMesh(
            currentSystem,
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
            orbitalData,
            currentSystemGroup,
            getCurrentSystemColour(name, isDarkMode),
        );
    }

    if (isComparingToSolarSystem) {
        const solarSystemData = allSystemData["Solar System"];
        if (!solarSystemData) {
            return;
        }

        const overlayColour = getTheme(isDarkMode).comparisonOverlay;

        // The comparison overlay uses a single colour for every object label and orbit
        for (const [name, position] of Object.entries(
            solarSystemData.positions,
        )) {
            if (name === "Sun") continue; // Skip the Sun for the comparison
            createOrUpdateObjectMesh(
                currentSystem,
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
                orbitalData,
                solarSystemGroup,
                overlayColour,
            );
        }
    }
}

/**
 * Sync the calendar to the last fetched simulation time (bypasses the throttle).
 */
export function syncCalendar() {
    if (lastFetchedSimulationTime === null) {
        return;
    }

    updateCalendar(lastFetchedSimulationTime, true);
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

    const orbitalDataValues = await getVisibleReferenceOrbitalDataValues(
        system,
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
 * Creates a handler for the controls change event.
 * @param {number} viewRadius The radius of view to fit within the camera
 * @returns {Function} The controls change handler
 */
function createControlsChangeHandler(viewRadius) {
    return () => {
        const cameraOffset = camera.position.clone().sub(controls.target);

        // Clamp the target position to be within the view radius
        const minLength = 0;
        const maxLength = viewRadius;
        controls.target.clampLength(minLength, maxLength);

        camera.position.copy(controls.target.clone().add(cameraOffset));
        updateReferenceGridScale(camera.position, controls.target);
        flipHabitableZoneTexture(camera.position);
    };
}

/**
 * Register pointer listeners on the canvas for raycasting. A click is ignored if it was part
 * of a camera drag, so that moving around and orienting the scene doesn't accidentally select
 * objects on the scene.
 *
 * A threshold of DRAG_THRESHOLD px is used so that accidental minute drags don't register
 * as a click.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
function initRaycastingEvents(canvas) {
    let pointerStart = null;
    let hasDragged = false;
    let objectWasClicked = false;

    // Detect when the user holds their mouse down on the canvas
    canvas.addEventListener("pointerdown", (event) => {
        pointerStart = {
            x: event.clientX,
            y: event.clientY,
        };
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!pointerStart || hasDragged) {
            return;
        }

        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;

        // The user has moved their mouse more than DRAG_THRESHOLD from where they initially held it down
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            hasDragged = true;
        }
    });

    canvas.addEventListener("pointerup", (event) => {
        if (!pointerStart) {
            return;
        }

        if (!hasDragged) {
            objectWasClicked = onCanvasClick(event, canvas);
        }

        pointerStart = null;
        hasDragged = false;
    });

    canvas.addEventListener("click", (event) => {
        if (objectWasClicked) {
            // Stop the further propagation of this click event (fired when the object
            // is clicked) so that the same event isn't intercepted by the event
            // listener which closes the Object information panel when the user clicks
            // off the panel.
            event.stopPropagation();
            objectWasClicked = false;
        }
    });

    canvas.addEventListener("pointercancel", () => {
        pointerStart = null;
        hasDragged = false;
    });
}

/**
 * Track the pointer over the canvas so the cursor can be updated every frame.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
function initHoverCursor(canvas) {
    // Store the pointer position whenever it moves over the canvas
    canvas.addEventListener("pointermove", (event) => {
        pointerPosition = { x: event.clientX, y: event.clientY };
    });
}

/**
 * Set the cursor to a pointer if an object is under the last known pointer
 * position, and to the default cursor otherwise. This is called every frame.
 *
 * @param {HTMLCanvasElement} canvas The canvas the scene is rendered on
 */
function updateHoverCursor(canvas) {
    const name =
        pointerPosition &&
        getObjectNameAt(pointerPosition.x, pointerPosition.y, canvas);

    // `name` is null if there is no object at the current pointer position
    canvas.style.cursor = name ? "pointer" : "default";
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
    currentSimulationTime = clampSimulationTime(getSimulationTime(name));

    const systemInfo = await getSystemInfo(currentSystem);
    habitableZone.start = systemInfo["habitable zone"].start;
    habitableZone.end = systemInfo["habitable zone"].end;
    setCurrentSystemColours(systemInfo.objects);
    setObjectTypes(systemInfo.objects);

    const canvas = document.getElementById("simulation-canvas");
    initRenderer(canvas);

    setReferenceSystemData(currentSystem, systemInfo["reference"]);

    await updateViewRadius(
        currentSystem,
        false, // Not comparing to the Solar System
        simulationState.habitableZoneShown,
    );
    await setDefaultViewRadii(currentSystem);
    setObjectSize();
    await updateInnermostPeriapsis(currentSystem, false);

    // Align the system's average normal with the up vector (Z-axis)
    alignSystemToCameraUp(currentSystemGroup);

    const cameraAndControlsSettings = calculateCameraAndControlsSettings(
        viewRadius,
        objectSize,
    );
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(
        canvas,
        cameraAndControlsSettings,
        createControlsChangeHandler(viewRadius),
    );

    initRaycastingEvents(canvas);
    initHoverCursor(canvas);
    initLabelRenderer(canvas);
    initTimer();
    initScene();

    /**
     * Persist the last fetched simulation time and elapsed days text before the simulation is exited.
     */
    window.addEventListener("pagehide", () => {
        setSimulationTime(currentSystem, lastFetchedSimulationTime);

        const elapsedDaysText = getElapsedDaysText(lastFetchedSimulationTime);
        setElapsedText(currentSystem, elapsedDaysText);
    });

    // Start rendering frames and updating the simulation
    updateSimulation();
    renderFrame();
}

/**
 * Clamp a simulation time so it stays between the minimum and maximum simulation times.
 * Publishes LIMIT_REACHED if the time had to be clamped
 *
 * @param {number} time Time in milliseconds since Unix epoch
 * @returns {number} The clamped time
 */
function clampSimulationTime(time) {
    const clampedTime = THREE.MathUtils.clamp(
        time,
        MIN_SIMULATION_TIME,
        MAX_SIMULATION_TIME,
    );

    if (clampedTime !== time) {
        bus.publish(EVENTS.SIM.LIMIT_REACHED);
    }
    return clampedTime;
}

export function stepForward() {
    currentSimulationTime = clampSimulationTime(
        currentSimulationTime + getSimulationSpeedMilliseconds(currentSystem),
    );
    updateSimulation();
}

export function stepBack() {
    currentSimulationTime = clampSimulationTime(
        currentSimulationTime - getSimulationSpeedMilliseconds(currentSystem),
    );
    updateSimulation();
}

export function resetSimulationTimeToNow() {
    currentSimulationTime = Date.now();
    updateSimulation();
}

export function setSimulationTimeToTime(time) {
    currentSimulationTime = clampSimulationTime(time);
    updateSimulation();
}

async function updateCameraAndControlsToViewRadius() {
    const canvas = renderer.domElement;

    // Update the camera and controls for the new view radius
    const cameraAndControlsSettings = calculateCameraAndControlsSettings(
        viewRadius,
        objectSize,
    );
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(
        canvas,
        cameraAndControlsSettings,
        createControlsChangeHandler(viewRadius),
    );
}

export async function resetView(topDown = true) {
    await updateViewRadius(
        currentSystem,
        comparingToSolarSystem,
        habitableZoneMesh?.visible,
    );
    updateCameraAndControlsToViewRadius();

    // Animate to the default controls target
    cameraAnimationState.target.copy(cameraDefaults.target);

    if (topDown) {
        // Animate to the default camera position
        cameraAnimationState.position.copy(cameraDefaults.position);
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
        const newCameraPosition = cameraAnimationState.target
            .clone()
            .add(newCameraOffset);

        cameraAnimationState.position.copy(newCameraPosition);
    }

    cameraAnimationState.currentStep = 0;
    cameraAnimationState.isAnimating = true;
}

export async function compareToSolarSystem() {
    const canvas = renderer.domElement;

    await updateViewRadius(currentSystem, true, habitableZoneMesh?.visible);
    await updateInnermostPeriapsis(currentSystem, true);

    // Align the solar system's average normal with the up vector (Z-axis)
    alignSystemToCameraUp(solarSystemGroup, true);

    solarSystemGroup.visible = true;

    const cameraAndControlsSettings = calculateCameraAndControlsSettings(
        viewRadius,
        objectSize,
    );
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(
        canvas,
        cameraAndControlsSettings,
        createControlsChangeHandler(viewRadius),
    );

    resetView();

    updateSimulation();
}

export async function hideSolarSystem() {
    // Update the camera and controls to fit the current system again

    const canvas = renderer.domElement;
    await updateViewRadius(currentSystem, false, habitableZoneMesh?.visible);
    await updateInnermostPeriapsis(currentSystem, false);
    solarSystemGroup.visible = false;

    const cameraAndControlsSettings = calculateCameraAndControlsSettings(
        viewRadius,
        objectSize,
    );
    initOrUpdateCamera(canvas, cameraAndControlsSettings);
    initOrUpdateControls(
        canvas,
        cameraAndControlsSettings,
        createControlsChangeHandler(viewRadius),
    );

    resetView();

    updateSimulation();
}

/**
 * Resets the view if the camera is zoomed out further than the current maximum camera distance.
 */
function resetViewIfBeyondMaxDistance() {
    const cameraDistance = camera.position.distanceTo(controls.target);

    if (cameraDistance > controls.maxDistance) {
        resetView(false);
    }
}

/**
 * Animate the camera so that the given object's orbit fills the view. Only
 * elliptical orbits can be fit in view.
 *
 * @param {string} name Name of the object whose orbit to frame
 * @returns {boolean} Whether the orbit could be fit in view
 */
function fitViewToObjectOrbit(name) {
    const orbitalData = lastSystemData?.[currentSystem]?.orbital_data?.[name];

    if (!orbitalData || orbitalData.e >= 1) {
        return false;
    }

    const apoapsis = calculateApoapsis(orbitalData.a, orbitalData.e);

    // The radius the camera needs to fit in view
    const effectiveRadius = apoapsis * VIEW_RADIUS_MULTIPLIER;

    animateCameraToFitRadius(effectiveRadius, objectSize);

    return true;
}

/**
 * Animate the camera so that the habitable zone fits in view.
 */
function fitViewToHabitableZone() {
    // The radius the camera needs to fit in view
    const effectiveRadius = habitableZone.end * VIEW_RADIUS_MULTIPLIER;

    animateCameraToFitRadius(effectiveRadius, objectSize);
}

/**
 * Show or hide the habitable zone. Showing it zooms the camera so that the habitable zone fits in view.
 *
 * The camera does not move when the habitable zone is hidden.
 *
 * @param {boolean} value Whether the habitable zone should be visible
 */
export async function setHabitableZoneVisibility(value) {
    if (habitableZoneMesh) {
        habitableZoneMesh.visible = value;
    }

    await updateViewRadius(currentSystem, comparingToSolarSystem, value);
    updateCameraAndControlsToViewRadius();

    // When hiding the habitable zone, only reset the view if the camera is zoomed out further than the new max distance
    if (!value) {
        resetViewIfBeyondMaxDistance();
        return;
    }

    fitViewToHabitableZone();
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

/**
 * Show or hide an object and its orbit.
 *
 * On showing an object, its orbit is fit in view. If the object cannot be
 * fit in view (orbit is non-elliptical), then the entire view is reset.
 *
 * The camera view does not change on hiding an object.
 *
 * @param {string} name Name of the object
 * @param {boolean} value Whether the object should be visible
 */
export async function setObjectVisibility(name, value) {
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

    await updateViewRadius(
        currentSystem,
        comparingToSolarSystem,
        habitableZoneMesh?.visible,
    );
    updateCameraAndControlsToViewRadius();

    // When hiding an object, only reset the view if the camera is zoomed out further than the new max distance
    if (!value) {
        resetViewIfBeyondMaxDistance();
        return;
    }

    // Object's orbit cannot fit in view, so reset the view normally
    if (!fitViewToObjectOrbit(name)) {
        resetView(false);
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
    updateHabitableZoneTexture(getTheme(), fontFamily);
}

export function toggleSimulationDarkMode(isDarkMode) {
    const theme = getTheme(isDarkMode);

    scene.background = theme.background;
    referenceGrid.material.color.set(theme.referenceGrid);

    const labelBackground = theme.labelBackground;
    const overlayColour = theme.comparisonOverlay;

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

    updateHabitableZoneTexture(theme, getFontFamily(settings.font));
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
            line.material.lineWidth = getOrbitLineWidth(
                line.parent === solarSystemGroup,
            );
        }
    }

    return needResize;
}

/**
 * Render the meshes and objects on every animation frame.
 */
async function renderFrame(timestamp) {
    resizeRendererToDisplaySize();

    timer.update(timestamp);

    if (running && !frozen) {
        // Measure the change in time in seconds since the last frame
        const deltaTime = timer.getDelta();

        currentSimulationTime = clampSimulationTime(
            currentSimulationTime +
                getSimulationSpeedMilliseconds(currentSystem) * deltaTime,
        );

        // Update the simulation but do not bypass the calendar update throttle
        updateSimulation(false);
    }

    animateCamera();

    updateScreenSpaceScales();
    updateObjectLabelOffsets();

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);

    updateHoverCursor(renderer.domElement);

    // Invoke render() on the next frame
    requestAnimationFrame(renderFrame);
}
