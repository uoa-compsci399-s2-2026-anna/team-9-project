import signal
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import rebound
import os
import json
import sys

# Prevent internal server errors when adding objects to the simulation
rebound.horizons.SSL_CONTEXT = 'unverified'

# Resolve base path to the packaged resources folder when frozen,
# or to the script's own directory otherwise
if getattr(sys, 'frozen', False):
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

sim = None
objects = []


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
async def simulation(request: Request, system_name: str, state: str = "{}", settings: str = "{}", fullscreen: bool = False):
    sim_state = json.loads(state)

    settings_state = json.loads(settings)

    # Get the current system
    current_system = next(
        system for system in all_systems if system["name"] == system_name
    )

    # Get all other systems, except the current system
    dropdown_systems = [
        system for system in all_systems if system["name"] != current_system["name"]
    ]

    return templates.TemplateResponse(
        request=request,
        name="simulation.html",
        context={
            "sim_state": sim_state,
            "settings": settings_state,
            "settings_schema": settings_schema,
            "sim_state_schema": sim_state_schema,
            "fullscreen": fullscreen,

            "systems": all_systems,
            "current_system": current_system,
            "dropdown_systems": dropdown_systems,

            "object_num": 9, # Temporary; set this programmatically (or have we decided against an object count?)

            # Control which components are rendered on the html page
            "navigation_bar": True,
            "system_dropdown": True,
            "settings_overlay": True
        }
    )


@app.get("/kill")
async def kill():
    """
    API Endpoint to kill the application as CTRL+C does not always work
    """
    sim.stop()
    os.kill(os.getpid(), signal.SIGINT)


@app.get("/system")
async def get_system_data(system_name: str = "", t: float = 0.0):
    """
    GET /system endpoint
    """
    system_name = system_name.lower()

    # Catch poor input
    print(system_name)
    if not any(system["name"].lower() == system_name for system in all_systems):
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Find the next requested system
    system = next(system for system in all_systems if system["name"].lower() == system_name)

    # Hardcode Solar System
    if system_name == "solar system":
        # Init state if empty
        if sim is None:
            init_solar()

        # Set time
        sim.integrate(t)

        # Calculate relevant data and return
        return calculate_simulation_info(sim)


def calculate_simulation_info(sim):
    """
    Given a REBOUND simulation, calculate:
    - Particle positions
    - Barycentric orbital information
        - Semi-major axis: AU
        - Eccentricity: -1 - 1
        - Longitude of the ascending node: radians (0-2pi)
        - Inclination: radians (0-2pi)
    """
    # Gather positions
    positions = {}
    for i, p in enumerate(sim.particles):
        positions[objects[i]] = {"x": p.x, "y": p.y, "z": p.z}

    # Gather orbital data excluding
    orbital_data = {}
    for i, p in enumerate(sim.particles):
        # Get the COM of the system
        com = sim.com()

        particle = sim.particles[i]
        orbit = particle.orbit(primary=com)

        """
        https://rebound.hanno-rein.de/particles/orbitalelements/
        
        a 	semi-major axis
        e 	eccentricity
        inc 	inclination, in radians
        Omega 	longitude of ascending node, in radians
        omega 	argument of pericenter, in radians
        """
        orbital_data[objects[i]] = {
            "a": orbit.a,  # Longest radius of ellipse
            "e": orbit.e,  # Shape of ellipse
            "inc": orbit.inc,  # Amount to tilt
            "Omega": orbit.Omega,  # Angle about the center axis
            "omega": orbit.omega, # Argument of the pericenter
        }

    return {"positions": positions, "orbital_data": orbital_data}


def init_solar():
    """
    Initialise solar system function
    """
    global sim
    global objects

    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add the sun at current position
    # sim.add("Sun")
    sim.add("solar system")

    # Add and set all objects in the solar system
    objects = [
        "Sun",
        "Mercury",
        "Venus",
        "Earth",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "1P/Halley",
    ]

    # Add Halley's comet
    sim.add(
        m=0.0,
        a=17.8,
        e=0.967,
        inc=162.0 * 3.14159 / 180.0,
        omega=58.4 * 3.14159 / 180.0,
        Omega=111.9 * 3.14159 / 180.0,
        M=0.0,
    )

    # Move to COM of the system
    sim.move_to_com()
