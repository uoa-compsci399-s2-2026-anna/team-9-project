export let simulationSpeed = 1_000_000 // Around 11.57 days/second

export let running = false;

export function setRunning(value) {
    running = value;
}

export let frozen = false;

export function setFrozen(value) {
    frozen = value;
}