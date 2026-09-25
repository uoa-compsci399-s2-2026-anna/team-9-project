import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { settings } from "../shared/settingsState.js";
import {
    timeToMilliseconds,
    dateOnly,
    convertToEpoch,
    formatInTimeZone,
} from "../utils/utils.js";

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
const calendarInputs = document.querySelectorAll(".calendar");

const FlatpickrInstances = Array.from(calendarInputs).map((input) =>
    flatpickr(input, {
        enableTime: true,
        dateFormat: "d-m-Y G:i K", // Format: "dd-MM-yyyy hh:mm a"
        allowInput: false,
        onChange: (_selectedDates, dateStr, instance) => {
            // Stop auto-selection of hour after picking a date
            requestAnimationFrame(() => {
                instance.hourElement?.blur();
            });
            const timeZone = input.dataset.timezone;
            const epochMs = convertToEpoch(dateStr, timeZone);
            bus.publish(EVENTS.SIM.CALENDAR_CHANGE, {
                time: epochMs,
            });
        },
    }),
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

/**
 * Gets the time zone currently used by the calendars.
 * @returns {string} The calendar's time zone setting (e.g., "UTC", "NZT")
 */
export function getCalendarTimeZone() {
    return calendarInputs[0]?.dataset.timezone;
}

bus.subscribe(EVENTS.SETTINGS.FONT_SELECT, (event) => {
    setFlatpickrFont(event.detail.value, settings.textSize);
});

bus.subscribe(EVENTS.SETTINGS.TEXT_SIZE_SELECT, (event) => {
    setFlatpickrFont(settings.font, event.detail.value);
});

bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, (event) => {
    const newTimeZone = event.detail.value;

    calendarInputs.forEach((input) => {
        input.dataset.timezone = newTimeZone;
    });

    document.querySelectorAll(".calendar-timezone-label").forEach((label) => {
        label.textContent = `${newTimeZone}`;
    });

    // Refresh the calendar with the last simulation time to reflect the new time zone
    updateCalendar(lastSimulationTime);
});

/**
 * Gets the elapsed days text which describes how far the simulation time is from today,
 * in the current time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 * @returns The elapsed days text
 */
export function getElapsedDaysText(simulationTime) {
    const simDateString = dateOnly(new Date(simulationTime));
    const nowDateString = dateOnly(new Date());

    if (simDateString === nowDateString) {
        return "Today";
    }

    const simMidnight = new Date(simDateString + "T00:00:00Z").getTime();
    const nowMidnight = new Date(nowDateString + "T00:00:00Z").getTime();

    const daysCount = Math.round((simMidnight - nowMidnight) / MS_PER_DAY);
    const dayWord = Math.abs(daysCount) === 1 ? "day" : "days";

    if (daysCount > 0) {
        return `${daysCount} ${dayWord} from today`;
    } else {
        return `${Math.abs(daysCount)} ${dayWord} ago`;
    }
}

/**
 * Updates the elapsed days text to show how far the simulation time is from today,
 * in the current time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 */
function updateElapsedDaysText(simulationTime) {
    const elapsedDays = document.querySelector("#elapsed-days");

    if (!elapsedDays) {
        return;
    }

    const elapsedDaysText = getElapsedDaysText(simulationTime);
    elapsedDays.textContent = elapsedDaysText;
}

/**
 * Updates all calendars to show the given simulation time in the given time zone,
 * and sets the minimum and maximum of the calendar to +/- `CALENDAR_RANGE_YEARS`.
 *
 * Updates are throttled to at most one per `CALENDAR_MIN_INTERVAL_MS`.
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

    FlatpickrInstances.forEach((instance) => {
        const timeZone = instance.input.dataset.timezone;
        instance.set(
            "minDate",
            formatInTimeZone(simulationTime - CALENDAR_RANGE_MS, timeZone),
        );
        instance.set(
            "maxDate",
            formatInTimeZone(simulationTime + CALENDAR_RANGE_MS, timeZone),
        );
        instance.setDate(formatInTimeZone(simulationTime, timeZone), false);
    });
    updateElapsedDaysText(simulationTime);
}
