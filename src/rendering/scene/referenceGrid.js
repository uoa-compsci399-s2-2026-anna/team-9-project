import * as THREE from "three";

import { bus } from "../../events/eventBus.js";
import { EVENTS } from "../../events/events.js";
import {
    simulationState,
    comparingToSolarSystem,
} from "../../shared/simulationState.js";

import { FOV, cameraDefaults } from "../cameraAndControls.js";
import {
    currentSystemDefaultViewRadius,
    solarSystemDefaultViewRadius,
} from "../viewRadius.js";
import {
    calculateCameraDistanceToTargetProjection,
    calculateReferenceGridDivisionSize,
} from "../simulationCalculations.js";
import { getTheme } from "../themes.js";

// Size of the reference grid in AU when scale = 1.
// This will be scaled when the camera zoom changes.
export const REFERENCE_GRID_SIZE = 1000;

export const REFERENCE_GRID_DIVISIONS = 1000;
export const REFERENCE_GRID_DIVISION_SIZE =
    REFERENCE_GRID_SIZE / REFERENCE_GRID_DIVISIONS;
export const DIVISIONS_IN_VIEW = 10; // Number of divisions visible when viewing the grid perpendicularly
export const REFERENCE_GRID_OPACITY = 0.5;

export let referenceGrid;

/**
 * Create a reference grid in the XY plane.
 */
export function createReferenceGrid() {
    const referenceGridColor = getTheme().referenceGrid;
    referenceGrid = new THREE.GridHelper(
        REFERENCE_GRID_SIZE,
        REFERENCE_GRID_DIVISIONS,
    );
    referenceGrid.geometry.rotateX(Math.PI / 2); // Rotate the grid to lie in the XY plane
    referenceGrid.material.color.set(referenceGridColor);
    referenceGrid.material.transparent = true;
    referenceGrid.material.opacity = REFERENCE_GRID_OPACITY;
    referenceGrid.material.vertexColors = false; // Use a single colour for the grid lines
    referenceGrid.visible = simulationState.referenceGridShown;

    updateReferenceGridScale(cameraDefaults.position, cameraDefaults.target);
}

/**
 * Update the scale of the reference grid based on the camera's distance to the target.
 *
 * The grid is scaled so that a fixed number of divisions are visible to the camera when looking at it
 * perpendicularly.
 *
 * @param {THREE.Vector3} cameraPosition The position of the camera
 * @param {THREE.Vector3} targetPosition The position of the camera's target
 */
export function updateReferenceGridScale(cameraPosition, targetPosition) {
    const cameraDistanceToTargetProjection =
        calculateCameraDistanceToTargetProjection(
            cameraPosition,
            targetPosition,
        );

    const desiredReferenceGridDivisionSize = calculateReferenceGridDivisionSize(
        FOV,
        cameraDistanceToTargetProjection,
        DIVISIONS_IN_VIEW,
    );

    const coveredRange =
        desiredReferenceGridDivisionSize * REFERENCE_GRID_DIVISIONS;

    let viewRadiusToCover = currentSystemDefaultViewRadius;
    if (comparingToSolarSystem) {
        viewRadiusToCover = Math.max(
            viewRadiusToCover,
            solarSystemDefaultViewRadius,
        );
    }

    if (coveredRange < viewRadiusToCover * 2) return; // Don't scale if it doesn't cover the view radius

    const scaleFactor =
        desiredReferenceGridDivisionSize / REFERENCE_GRID_DIVISION_SIZE;
    referenceGrid.scale.set(scaleFactor, scaleFactor, scaleFactor);

    bus.publish(EVENTS.SIM.UPDATE_GRID_SCALE, { value: scaleFactor });
}
