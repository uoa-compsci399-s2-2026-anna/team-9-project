import * as THREE from "three";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

export let renderer;
export let labelRenderer;

/**
 * Initializes the `renderer` variable with a new `THREE.WebGLRenderer` instance
 * that uses the given `canvas` element. The renderer is set to use antialiasing
 * for smoother edges.
 * @param {HTMLCanvasElement} canvas The canvas element to be used by the renderer
 */
export function initRenderer(canvas) {
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
}

/**
 * Initialise the label renderer for the simulation renderer.
 * @param {HTMLCanvasElement} canvas The canvas element to render on
 */
export function initLabelRenderer(canvas) {
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    labelRenderer.domElement.style.position = "fixed";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.left = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement.appendChild(labelRenderer.domElement);
}
