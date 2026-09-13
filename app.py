from datetime import datetime
from fastapi import FastAPI, HTTPException, status, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from systems import unix_to_sim_time, init_system
from typing import Annotated
from zoneinfo import ZoneInfo
import json
import os
import rebound
import signal
import sys
import time

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

app.mount("/src", StaticFiles(directory=os.path.join(base_path, "src")), name="src")
app.mount("/dist", StaticFiles(directory=os.path.join(base_path, "dist")), name="dist")


def get_system_with_name(name):
    name = name.lower()
    return next(
        system_data
        for system_data in all_systems
        if system_data["name"].lower() == name
    )


def init_system_with_name(name):
    return init_system(get_system_with_name(name), name)


# Each init_*() returns (sim, objects); take only the list of string objects
sims = {
    "solar system": init_system_with_name("solar system"),
    "kepler-16": init_system_with_name("kepler-16"),
    "trappist-1": init_system_with_name("trappist-1"),
}

MS_PER_SECOND = 1000

TIMEZONE_MAP = {
    "NZT": "Pacific/Auckland",
    "UTC": "UTC",
}


def format_sim_date(simulation_time_ms, timezone_key):
    """Formats a simulation time as a "yyyy-MM-ddTHH:mm" string, in the given time zone."""
    time_zone_name = TIMEZONE_MAP.get(timezone_key, "UTC")
    time_zone = ZoneInfo(time_zone_name)

    sim_date = datetime.fromtimestamp(simulation_time_ms / MS_PER_SECOND, tz=time_zone)

    return sim_date.strftime("%Y-%m-%dT%H:%M")


@app.get("/")
async def home(request: Request, settings: str = "{}", fullscreen: bool = False):
    settings_state = json.loads(settings)

    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context={
            "settings": settings_state,
            "settings_schema": settings_schema,
            "fullscreen": fullscreen,
            "systems": all_systems,
            "dropdown_systems": all_systems,
            # Control which components are rendered on the html page
            "navigation_bar": True,
            "system_dropdown": False,
            "logo": True,
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
):
    sim_state = json.loads(state)

    settings_state = json.loads(settings)

    # Get the current system
    current_system = get_system_with_name(system_name)
    # Get all other systems, except the current system
    dropdown_systems = [
        system_data for system_data in all_systems if system_data["name"] != system_name
    ]

    # Get the current system's string object list by lookup
    objects = sims[system_name.lower()][1]

    # Get the current simulation date string for the system as a "yyyy-MM-ddTHH:mm" string
    if system_name in sim_state["formattedSimulationDates"]:
        simulation_date = sim_state["formattedSimulationDates"][system_name]
    else:
        # Fallback to the current time
        # Note: Simulation times are stored and managed on the frontend in milliseconds
        simulation_date = format_sim_date(
            time.time() * MS_PER_SECOND, settings_state["timeZone"]
        )

    # Get the elapsed days text for the system (e.g., "10 days from today")
    elapsed_days_fallback_text = sim_state_schema["elapsedDaysTexts"]["fallbackText"]
    elapsed_days_text = sim_state["elapsedDaysTexts"].get(
        system_name, elapsed_days_fallback_text
    )

    return templates.TemplateResponse(
        request=request,
        name="simulation.html",
        context={
            "sim_state": sim_state,
            "settings": settings_state,
            "settings_schema": settings_schema,
            "sim_state_schema": sim_state_schema,
            "fullscreen": fullscreen,
            "sim_date": simulation_date,
            "elapsed_days_text": elapsed_days_text,
            "systems": all_systems,
            "current_system": current_system,
            "dropdown_systems": dropdown_systems,
            "objects": objects,
            # Control which components are rendered on the html page
            "navigation_bar": True,
            "system_dropdown": True,
            "settings_overlay": True,
        },
    )


@app.get("/kill")
async def kill():
    """
    API Endpoint to kill the application as CTRL+C does not always work
    """
    for sim in sims.values():
        sim[0].stop()
    os.kill(os.getpid(), signal.SIGINT)


@app.get("/system_info")
async def get_system_info(system_name: str = ""):
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
        "reference": get_system_data_at_time(system_name, 0),
    }

  
def get_system_data_at_time(system_name: str, t):
    """
    Gets a system at a specific sim time (set in config.json)
    Returns simulation data.
    """

    # Convert the system name to lowercase for API resilience
    system_name = system_name.lower()
    system_data = get_system_with_name(system_name)

    # Catch poor input
    if system_data is None:
        print("ERROR:", system_name, "not found")
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    sim, objects = sims.get(system_name, (None, None))

    # Init system if it is none
    if sim is None:
        sim, objects = init_system(system_data)

    if sim is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    sims[system_name] = (sim, objects)

    # Integrate to given time
    sim.integrate(t)

    # Gather positions
    positions = {objects[i]: get_position_dict(p) for i, p in enumerate(sim.particles)}

    # Gather orbital data for each object
    orbital_data = {
        objects[i]: get_osculating_orbit(sim, i) for i in range(len(sim.particles))
    }

    return {"positions": positions, "orbital_data": orbital_data}


@app.get("/system")
async def get_system_data(
    system_names: Annotated[list[str] | None, Query()] = None, t: float = 0.0
):
    """
    GET /system endpoint
    System_names are in list parameter format ?system_names=1&system_names=2
    """

    if system_names is None or len(system_names) == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    systems = {}

    for original_system_name in system_names:
        sim_time = unix_to_sim_time(system_name, t)
        systems[original_system_name] = get_system_data_at_time(system_name, sim_time)

    return systems



@app.get("/system")
async def get_system_data(system_name: str = "", t: float = 0.0):
    """
    GET /system endpoint
    """

    sim_time = unix_to_sim_time(system_name, t)
    return get_system_data_at_time(system_name, sim_time)


def get_position_dict(particle):
    """
    Convert a particle to a dictionary of a positions
    """
    return {"x": particle.x, "y": particle.y, "z": particle.z}


def get_osculating_orbit(sim, i):
    """
    Given a REBOUND simulation, calculate:
    - Barycentric osculating orbital information
        - Semi-major axis: AU
        - Eccentricity: -1 - 1
        - Longitude of the ascending node: radians (0-2pi)
        - Inclination: radians (0-2pi)
    """
    particle = sim.particles[i]

    total_mass = 0.0
    x = y = z = 0.0
    vx = vy = vz = 0.0

    # Loop through all other particles
    for j, other in enumerate(sim.particles):
        if i == j:
            continue

        total_mass += other.m
        x += other.m * other.x
        y += other.m * other.y
        z += other.m * other.z
        vx += other.m * other.vx
        vy += other.m * other.vy
        vz += other.m * other.vz

    # The orbital pseudo-particle to calculate the orbit from
    primary = rebound.Particle(
        m=total_mass,
        x=x / total_mass,
        y=y / total_mass,
        z=z / total_mass,
        vx=vx / total_mass,
        vy=vy / total_mass,
        vz=vz / total_mass,
    )

    orbit = particle.orbit(primary=primary)

    """
    Return only necessary orbital information
    https://rebound.hanno-rein.de/particles/orbitalelements/
    
    a 	    semi-major axis
    e 	    eccentricity
    inc 	inclination, in radians
    Omega 	longitude of ascending node, in radians
    omega 	argument of pericenter, in radians
    """
    return {
        "a": orbit.a * total_mass / (total_mass + particle.m),
        "e": orbit.e,
        "inc": orbit.inc,
        "Omega": orbit.Omega,
        "omega": orbit.omega,
    }
