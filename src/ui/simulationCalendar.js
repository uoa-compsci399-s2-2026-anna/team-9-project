import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { settings } from "../shared/settingsState.js";
import {
    timeToMilliseconds,
    dateOnly,
    convertToEpoch,
    formatInTimeZone,
    TIMEZONE_MAP,
    MIN_SIMULATION_TIME,
} from "../utils/utils.js";
import { DateTime } from "luxon";

// The number of milliseconds in a day
const MS_PER_DAY = timeToMilliseconds(1, "day");

// Date range for calender
const CALENDAR_RANGE_YEARS = 10;
const CALENDAR_RANGE_MS = timeToMilliseconds(CALENDAR_RANGE_YEARS, "year");

// The minimum interval (in milliseconds) for updating the calendar
const CALENDAR_UPDATE_INTERVAL = 100;
let lastCalendarUpdate = 0;

// The last simulation time (in ms since the Unix epoch) displayed by the calendar
let lastSimulationTime = null;

// Initialise Flatpickr on every calendar input
const calendarInput = document.querySelector(".calendar");

const FlatpickrInstance = flatpickr(calendarInput, {
    enableTime: true,
    dateFormat: "d-m-Y G:i K", // Format: "dd-MM-yyyy hh:mm a"
    allowInput: false,
    onChange: (selectedDates, dateStr, instance) => {
        if (selectedDates.length === 0) {
            // Restore the current simulation time
            if (lastSimulationTime !== null) {
                updateCalendar(lastSimulationTime, true);
            }
            return;
        }

        // Stop auto-selection of hour after picking a date
        requestAnimationFrame(() => {
            instance.hourElement?.blur();
        });
        const timeZone = calendarInput.dataset.timezone;
        const epochMs = convertToEpoch(dateStr, timeZone);
        bus.publish(EVENTS.SIM.CALENDAR_CHANGE, {
            time: epochMs,
        });
    },
});

// Stop backspace/delete from clearing the calendar input
calendarInput.addEventListener(
    "keydown",
    (event) => {
        if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            event.stopPropagation();
        }
    },
    { capture: true },
);

// Set Flatpickr theme
const flatpickrLightTheme = document.getElementById("flatpickr-light-theme");
const flatpickrDarkTheme = document.getElementById("flatpickr-dark-theme");

function setFlatpickrTheme(isDarkMode) {
    flatpickrLightTheme.disabled = isDarkMode;
    flatpickrDarkTheme.disabled = !isDarkMode;
}

bus.subscribe(EVENTS.TOOLBAR.DARK_MODE_TOGGLE, (event) => {
    setFlatpickrTheme(event.detail.enterDarkMode);
});

// Set Flatpickr font family and size
const calendarFontSizes = {
    Default: "14px",
    Larger: "15px",
};

const calendarFontFamilies = {
    Default: "inherit",
    OpenDyslexic: "OpenDyslexic",
};

function setFlatpickrFont(chosenFont, chosenSize) {
    const fontFamily =
        calendarFontFamilies[chosenFont] ?? calendarFontFamilies.Default;
    const fontSize = calendarFontSizes[chosenSize] ?? calendarFontSizes.Default;

    document.querySelectorAll(".flatpickr-calendar").forEach((calendar) => {
        calendar.style.fontFamily = fontFamily;
        calendar.style.fontSize = fontSize;
    });

    document.querySelectorAll(".flatpickr-time input").forEach((input) => {
        input.style.fontSize = fontSize;
    });
}

setFlatpickrFont(settings.font, settings.textSize);

bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setFlatpickrFont(event.detail.value, settings.textSize);
});

bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setFlatpickrFont(settings.font, event.detail.value);
});

bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, (event) => {
    const newTimeZone = event.detail.value;

    calendarInput.dataset.timezone = newTimeZone;

    document.querySelector(".calendar-timezone-label").textContent =
        `${newTimeZone}`;

    // Refresh the calendar with the last simulation time to reflect the new time zone
    if (lastSimulationTime !== null) {
        updateCalendar(lastSimulationTime, true);
    }
});

/**
 * Gets the elapsed days text which describes how far the simulation time is from today,
 * in the given time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 * @param {string} timeZone The calendar's time zone setting (e.g., "UTC", "NZT")
 * @returns The elapsed days text
 */
export function getElapsedDaysText(
    simulationTime,
    timeZone = calendarInput.dataset.timezone,
) {
    const zone = TIMEZONE_MAP[timeZone] ?? "UTC;";
    const simLocal = DateTime.fromMillis(simulationTime, { zone });
    const nowLocal = DateTime.now().setZone(zone);

    if (simLocal.hasSame(nowLocal, "day")) {
        return "Today";
    }

    // Compare plain calendar dates at midnight UTC
    const simDate = DateTime.utc(simLocal.year, simLocal.month, simLocal.day);
    const nowDate = DateTime.utc(nowLocal.year, nowLocal.month, nowLocal.day);

    // Always measure from the earlier date to the later one
    const isFuture = simDate > nowDate;
    const [start, end] = isFuture ? [nowDate, simDate] : [simDate, nowDate];

    const diff = end.diff(start, ["years", "days"]);
    const years = Math.round(diff.years);
    const days = Math.round(diff.days);

    const parts = [];
    if (years > 0) {
        parts.push(`${years} ${years === 1 ? "year" : "years"}`);
    }
    if (days > 0) {
        parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    }

    const elapsedText = parts.join(" ");
    return isFuture ? `${elapsedText} from today` : `${elapsedText} ago`;
}

/**
 * Updates the elapsed days text to show how far the simulation time is from today,
 * in the given time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 * @param {string} timeZone The calendar's time zone setting (e.g., "UTC", "NZT")
 */
function updateElapsedDaysText(simulationTime, timeZone) {
    const elapsedDays = document.querySelector("#elapsed-days");

    if (!elapsedDays) {
        return;
    }

    const elapsedDaysText = getElapsedDaysText(simulationTime, timeZone);
    elapsedDays.textContent = elapsedDaysText;
}

/**
 * Updates all calendars to show the given simulation time in each calendar's time zone,
 * and sets the minimum and maximum of the calendar to +/- `CALENDAR_RANGE_YEARS`.
 *
 * Updates are throttled to at most one per `CALENDAR_UPDATE_INTERVAL`.
 *
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 * @param {boolean} forceUpdate Whether or not to bypass the throttle
 */
export function updateCalendar(simulationTime, forceUpdate = false) {
    lastSimulationTime = simulationTime;

    const now = performance.now();
    const timeSinceUpdate = now - lastCalendarUpdate;
    if (!forceUpdate && timeSinceUpdate < CALENDAR_UPDATE_INTERVAL) {
        return;
    }

    lastCalendarUpdate = now;

    const timeZone = calendarInput.dataset.timezone;

    const minTime = Math.max(
        simulationTime - CALENDAR_RANGE_MS,
        MIN_SIMULATION_TIME,
    );

    FlatpickrInstance.set("minDate", formatInTimeZone(minTime, timeZone));
    FlatpickrInstance.set(
        "maxDate",
        formatInTimeZone(simulationTime + CALENDAR_RANGE_MS, timeZone),
    );
    FlatpickrInstance.setDate(
        formatInTimeZone(simulationTime, timeZone),
        false,
    );
    updateElapsedDaysText(simulationTime, timeZone);
}
