export const EVENTS = {
    SIM: {
        START: "sim:start",
        STOP: "sim:stop",
        FREEZE: "sim:freeze",
        UNFREEZE: "sim:unfreeze",
        ADJUST_SPEED: "sim:adjust_speed",
        ADJUST_SPEED_UNIT: "sim:adjust_speed_unit",
        STEP_FORWARD: "sim:step_forward",
        STEP_BACK: "sim:step_back",
        RESET_VIEW: "sim:reset_view",
        HABITABLE_ZONE_TOGGLE: "sim:habitable_zone_toggle",
        ORBITS_TOGGLE: "sim:orbits_toggle",
        REFERENCE_GRID_TOGGLE: "sim:reference_grid_toggle",
        LABELS_TOGGLE: "sim:labels_toggle",
        OBJECT_TOGGLE: "sim:object_toggle",
    },
    FULLSCREEN: {
        ENTER: "fullscreen:enter",
        EXIT: "fullscreen:exit",
    },
    SETTINGS: {
        TIME_ZONE_SELECT: "settings:time_zone_select",
        FONT_SELECT: "settings:font_select",
        TEXT_SIZE_SELECT: "settings:text_size_select",
        OBJECT_MARKER_SIZE_SELECT: "settings:object_marker_size_select",
        ORBIT_LINES_SELECT: "settings:orbit_lines_select",
    }
}
