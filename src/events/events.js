export const EVENTS = {
    SIM: {
        TOGGLE: "sim:toggle",
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
        VIEW_SETTINGS_PANEL_TOGGLE: "sim:view_settings_panel_toggle",
        OBJECTS_PANEL_TOGGLE: "sim:objects_panel_toggle",
        SYSTEM_DROPDOWN_TOGGLE: "sim:system_dropdown_toggle",
        COMPARE_TO_SOLAR_SYSTEM: "sim:compare_to_solar_system",

        /**
         * When the calendar is changed (i.e. when the user selects a new date-time).
         */
        CALENDAR_CHANGE: "sim:calendar_change",

        /**
         * When the 'Now' button is clicked.
         */
        SET_TIME_TO_NOW: "sim:set_time_to_now",
    },
    TOOLBAR: {
        FULLSCREEN_BUTTON_TOGGLE: "toolbar:fullscreen_button_toggle",
        DARK_MODE_TOGGLE: "toolbar:dark_mode_toggle",

        /** When the home button is clicked. */
        HOME: "toolbar:home",
    },
    SETTINGS: {
        MENU_TOGGLE: "settings:menu_toggle",
        TIME_ZONE_SELECT: "settings:time_zone_select",
        FONT_SELECT: "settings:font_select",
        TEXT_SIZE_SELECT: "settings:text_size_select",
        OBJECT_MARKER_SIZE_SELECT: "settings:object_marker_size_select",
        ORBIT_LINES_SELECT: "settings:orbit_lines_select",
        RESET_SETTINGS_MENU_TOGGLE: "settings:reset_settings_menu_toggle",
        RESET_ALL_SETTINGS: "settings:reset_all_settings",
    },
};
