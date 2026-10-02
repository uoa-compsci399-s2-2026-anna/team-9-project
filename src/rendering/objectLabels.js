import * as THREE from "three";
import { settings } from "../shared/settingsState.js";
import { getTheme, getFontSize, getFontFamily } from "./simulationRenderer.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { camera } from "./simulationCameraAndControls.js";
import {
    currentSystemGroup,
    solarSystemGroup,
    objectSize,
    renderer,
} from "./simulationRenderer.js";

/**
 * Creates a label. The font size and family, and the div's background colour
 * are set as per the settings state.
 * @param {string} name Object name
 * @param {string} colour CSS colour string of label colour
 * @param {Number} opacity Opacity of label in interval [0, 1]
 * @returns {CSS2DObject} Created label div
 */
export function getLabel(name, colour, opacity) {
    const labelDiv = document.createElement("div");

    labelDiv.className = "planet-label";
    labelDiv.textContent = name;

    labelDiv.style.color = colour;
    labelDiv.style.backgroundColor = getTheme().labelBackground;

    labelDiv.style.opacity = opacity;

    labelDiv.style.fontSize = getFontSize(settings.textSize);
    labelDiv.style.fontFamily = getFontFamily(settings.font);
    labelDiv.style.fontWeight = "bold";

    labelDiv.style.padding = "1px 5px";
    labelDiv.style.borderRadius = "4px";
    labelDiv.style.whiteSpace = "nowrap";

    const label = new CSS2DObject(labelDiv);

    return label;
}

export function updateObjectLabelOffsets() {
    for (const group of [currentSystemGroup, solarSystemGroup]) {
        for (const mesh of group.children) {
            const label = mesh.children.find(
                (child) => child instanceof CSS2DObject,
            );

            if (!label) {
                continue;
            }

            /**
             * Vector to center of object in world coordinates.
             */
            const objectCenter = new THREE.Vector3();
            mesh.getWorldPosition(objectCenter);

            /**
             * Vector to edge of object in world coordinates.
             */
            const objectEdge = new THREE.Vector3();
            objectEdge.copy(objectCenter).addScaledVector(
                // Scale a unit vector by the object mesh's scale
                new THREE.Vector3(0, 1, 0),
                objectSize * mesh.scale.y,
            );

            // Project vectors to NDC space (coordinates in interval [-1, 1])
            objectCenter.project(camera);
            objectEdge.project(camera);

            // Get scalars in screen pixel coordinate space
            const centerY = ndcScalarToScreenScalar(objectCenter.y);
            const edgeY = ndcScalarToScreenScalar(objectEdge.y);

            // Calculate object radius in screen pixels
            const pixelLength = Math.abs(edgeY - centerY);

            label.element.style.marginTop = `${pixelLength}px`;
            label.element.style.marginLeft = `${pixelLength}px`;
        }
    }
}

/**
 * Converts a scalar in NDC space to a scalar in screen pixel space.
 *
 * i.e. a mapping from NDC space in interval [-1, 1] to screen pixel space
 * in interval [0, screen height].
 *
 * @param {Number} ndcDimension Single dimension of normalised device coordinate
 * system (i.e a scalar in NDC space) (in interval [-1, 1])
 * @returns Single dimension of `ndcDimension` scalar in screen pixel
 * coorindates
 */
function ndcScalarToScreenScalar(ndcDimension) {
    /**
     * The client height of the renderer.
     */
    const clientHeight = renderer.domElement.clientHeight;

    return ((ndcDimension + 1) / 2) * clientHeight;
}
