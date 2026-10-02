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
