import asyncio
import json
import os
import signal
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Annotated
from zoneinfo import ZoneInfo

import rebound
from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from systems import Simulations, jd_tdb_to_unix
from utility import (
    begin_integrating,
    check_sim_was_stopped,
    done_integrating,
    end_integrating,
    get_osculating_orbit,
    get_position_dict,
)

# Prevent internal server errors when adding objects to the simulation
rebound.horizons.SSL_CONTEXT = "unverified"

# Resolve base path to the packaged resources folder when frozen,
# or to the script's own directory otherwise
if getattr(sys, "frozen", False):
    base_path = os.path.dirname(os.path.dirname(sys.executable))
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()
templates = Jinja2Templates(directory=os.path.join(base_path, "src", "ui"))

# Load the config file
with open(os.path.join(base_path, "config.json")) as f:
    config = json.load(f)

# Get the systems in the config
all_systems = config["systems"]

# Load the settings schema
with open(os.path.join(base_path, "src", "shared", "settingsSchema.json")) as f:
    settings_schema = json.load(f)

# Load the sim state schema
with open(os.path.join(base_path, "src", "shared", "simulationStateSchema.json")) as f:
    sim_state_schema = json.load(f)

# Load the keyboard shortcuts
with open(
    os.path.join(base_path, "src", "shared", "shortcuts.json"), encoding="utf-8"
) as f:
    shortcuts = json.load(f)

app.mount("/src", StaticFiles(directory=os.path.join(base_path, "src")), name="src")
app.mount("/dist", StaticFiles(directory=os.path.join(base_path, "dist")), name="dist")

thread_pool = ThreadPoolExecutor()


def get_system_with_name(name: str):
    name = name.lower()
    return next(
        system_data
        for system_data in all_systems
        if system_data["name"].lower() == name
    )


# Initialise simulation states
sims = Simulations(all_systems)

MS_PER_SECOND = 1000

TIMEZONE_MAP = {
    "NZT": "Pacific/Auckland",
    "UTC": "UTC",
}


def format_sim_date(simulation_time_ms: float, timezone_key: str | None) -> str:
    """Formats a simulation time as a "yyyy-MM-ddTHH:mm" string, in the given time zone."""
    if timezone_key is None:
        raise ValueError("Invalid timezone")
    time_zone_name = TIMEZONE_MAP.get(timezone_key, "UTC")
    time_zone = ZoneInfo(time_zone_name)

    sim_date = datetime.fromtimestamp(simulation_time_ms / MS_PER_SECOND, tz=time_zone)

    return sim_date.strftime("%Y-%m-%dT%H:%M")


@app.get("/")
async def home(
    request: Request, settings: str = "{}", fullscreen: bool = False
) -> Response:
    settings_state = json.loads(settings)

    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context={
            "settings": settings_state,
            "settings_schema": settings_schema,
            "shortcuts": shortcuts,
            "fullscreen": fullscreen,
            "systems": all_systems,
            "dropdown_systems": all_systems,
            # Control which components are rendered on the html page
            "sidebar_settings": False,
            "simulation_controls": False,
            "settings_overlay": True,
        },
    )


@app.get("/simulation/{system_name}")
async def simulation(
    request: Request,
    system_name: str,
    state: str = "{}",
    settings: str = "{}",
    fullscreen: bool = False,
) -> Response:
    sim_state = json.loads(state)

    settings_state = json.loads(settings)

    # Get the current system
    current_system = get_system_with_name(system_name)
    # Get all other systems, except the current system
    dropdown_systems = [
        system_data for system_data in all_systems if system_data["name"] != system_name
    ]

    # Get the current system's string object list by lookup
    objects = sims.get_objects(system_name)

    # Get the current system's simulation speed
    sim_speed = sim_state["simulationSpeed"][system_name]
    sim_speed_unit = sim_state["simulationSpeedUnit"][system_name]

    # Get the current simulation date string for the system as a "yyyy-MM-ddTHH:mm" string
    if sim_state and system_name in sim_state["formattedSimulationDates"]:
        simulation_date = sim_state["formattedSimulationDates"][system_name]
    elif settings_state:
        # Fallback to the current time
        # Note: Simulation times are stored and managed on the frontend in milliseconds
        simulation_date = format_sim_date(
            time.time() * MS_PER_SECOND, settings_state["timeZone"]
        )
    else:
        simulation_date = format_sim_date(time.time() * MS_PER_SECOND, None)

    # Get the elapsed days text for the system (e.g., "10 days from today")
    elapsed_days_fallback_text = sim_state_schema["elapsedDaysTexts"]["fallbackText"]

    if sim_state:
        elapsed_days_text = sim_state["elapsedDaysTexts"].get(
            system_name, elapsed_days_fallback_text
        )
    else:
        elapsed_days_text = "Today"

    return templates.TemplateResponse(
        request=request,
        name="simulation.html",
        context={
            "sim_state": sim_state,
            "settings": settings_state,
            "settings_schema": settings_schema,
            "sim_state_schema": sim_state_schema,
            "shortcuts": shortcuts,
            "fullscreen": fullscreen,
            "sim_speed": sim_speed,
            "sim_speed_unit": sim_speed_unit,
            "sim_date": simulation_date,
            "elapsed_days_text": elapsed_days_text,
            "systems": all_systems,
            "current_system": current_system,
            "dropdown_systems": dropdown_systems,
            "objects": objects,
            # Control which components are rendered on the html page
            "settings_overlay": True,
        },
    )


@app.get("/kill")
async def kill():
    """
    API Endpoint to kill the application as CTRL+C does not always work
    """
    sims.stop_all()
    os.kill(os.getpid(), signal.SIGINT)


@app.get("/system_info")
async def get_system_info(system_name: str = "") -> dict:
    """
    GET /system_info endpoint
    """
    # Convert the system name to lowercase for API resilience
    system_name = system_name.lower()

    system_data = get_system_with_name(system_name)

    # Catch poor input
    if system_data is None:
        print("ERROR:", system_name, "not found")
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    return {
        "objects": system_data["objects"],
        "habitable zone": system_data["habitable zone"],
        "reference": sims.get_reference(system_name),
    }


async def get_system_data_at_time(
    system_name: str, t: float, should_integrate: bool = True
) -> dict:
    """
    Gets a system at a specific unix time.
    Returns simulation data.
    """

    # Convert the system name to lowercase for API resilience
    system_name = system_name.lower()
    system_data = get_system_with_name(system_name)

    # Catch poor input
    if system_data is None:
        print("ERROR:", system_name, "not found")
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    sim = sims.get_sim(system_name)
    objects = sims.get_objects(system_name)

    if sim is None or objects is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Only integrate if we should be integrating
    if should_integrate:
        # Integrate to given time using a process pool to keep interactivity
        loop = asyncio.get_running_loop()
        sim = await loop.run_in_executor(
            thread_pool, Simulations.quick_integrate, sims, t, system_data
        )

    # Gather positions
    positions = {objects[i]: get_position_dict(p) for i, p in enumerate(sim.particles)}

    # Gather orbital data for each object
    orbital_data = {
        objects[i]: get_osculating_orbit(sim, i) for i in range(len(sim.particles))
    }

    return {
        "positions": positions,
        "orbital_data": orbital_data,
        "time": jd_tdb_to_unix(sim.t),
    }


@app.get("/system")
async def get_system_data(
    system_names: Annotated[list[str] | None, Query()] = None, t: float = 0.0
) -> dict:
    """
    GET /system endpoint
    System_names are in list parameter format ?system_names=1&system_names=2
    """

    if system_names is None or len(system_names) == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    systems = {}

    # If any sim was preempted during integration at any point
    aborted = False

    try:
        await begin_integrating()
        for system_name in system_names:
            # Get system_data at a specific time unless a sim has been stopped
            # Then just get the system's data at it's current time
            systems[system_name] = await get_system_data_at_time(
                system_name, t, should_integrate=(not aborted)
            )

            # If the sim was preempted during integration do not integrate the other
            # systems but still get the data (at the time it was at)
            aborted = True if aborted else check_sim_was_stopped()
    finally:
        done_integrating()

    return systems


@app.delete("/current_integration")
async def stop_currently_integrating_sim():
    """
    Endpoint for priority actions to stop rebound from integrating early.
    I.e. if a user is integrating, reset to now should stop it and get to
    integrate instead.
    """
    await end_integrating()
