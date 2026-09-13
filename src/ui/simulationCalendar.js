import { bus } from "../events/eventBus.js";
import { EVENTS } from "../events/events.js";
import { formatDate, timeToMilliseconds, dateOnly } from "../utils/utils.js";

// The number of milliseconds in a day
const MS_PER_DAY = timeToMilliseconds(1, "day");

// The last simulation time (in ms since the Unix epoch) displayed by the calendar
let lastSimulationTime = null;

bus.subscribe(EVENTS.SETTINGS.TIME_ZONE_SELECT, () => {
    // Refresh the calendar with the last simulation time to reflect the new time zone
    updateCalendar(lastSimulationTime);
});

/**
 * Given the current simulation time in milliseconds since the Unix epoch, return
 * the formatted simulation date. This is used for persisting the simulation date
 * displayed by the calendar.
 * 
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 * @returns Formatted simulation date for the given `simulationTime` 
 */
export function formatSimulationDate(simulationTime) {
    return formatDate(new Date(simulationTime));
}

/**
 * Gets the elapsed days text which describes how far the simulation time is from today,
 * in the current time zone (e.g., "Today", "3 days from today", "5 days ago").
 * @param {*} simulationTime Simulation time as milliseconds since the Unix epoch
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
 * and sets the minimum and maximum of the calendar to +/- 3 years.
 * @param {number} simulationTime Simulation time as milliseconds since the Unix epoch
 */
export function updateCalendar(simulationTime) {
    lastSimulationTime = simulationTime;

    const date = new Date(simulationTime);

    const calendars = document.querySelectorAll(".calendar");

    const CALENDAR_RANGE_YEARS = 3;
    const CALENDAR_RANGE_MS = timeToMilliseconds(CALENDAR_RANGE_YEARS, "year");

    calendars.forEach((calendar) => {
        calendar.value = formatDate(date);
        calendar.min = formatDate(new Date(date.getTime() - CALENDAR_RANGE_MS));
        calendar.max = formatDate(new Date(date.getTime() + CALENDAR_RANGE_MS));
    });

    updateElapsedDaysText(simulationTime);
}
