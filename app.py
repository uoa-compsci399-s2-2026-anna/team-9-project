import signal
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import rebound
import os
import json
import sys
from systems import *

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

app.mount("/src", StaticFiles(directory=os.path.join(base_path, "src")), name="src")
app.mount("/dist", StaticFiles(directory=os.path.join(base_path, "dist")), name="dist")

sim = None
current_system = None
objects = []


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context={
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
async def simulation(request: Request, system_name: str):

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
            "systems": all_systems,
            "current_system": current_system,
            "dropdown_systems": dropdown_systems,
            "object_num": 9,  # Temporary; set this programmatically (or have we decided against an object count?)
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
    sim.stop()
    os.kill(os.getpid(), signal.SIGINT)


@app.get("/system")
async def get_system_data(system_name: str = "", t: float = 0.0):
    """
    GET /system endpoint
    """
    global sim, objects, current_system

    system_name = system_name.lower()

    # Catch poor input
    print(system_name)
    if not any(system["name"].lower() == system_name for system in all_systems):
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Hardcode Solar System
    if system_name == "solar system" and current_system != "solar system":
        # Init state if empty
        sim, objects = init_solar()
        current_system = system_name
    # Hardcode Kepler-16
    elif system_name == "kepler-16" and current_system != "kepler-16":
        # Init state if empty
        sim, objects = init_kepler_16()
        current_system = system_name
    # Hardcode TRAPPIST-1
    elif system_name == "trappist-1" and current_system != "trappist-1":
        # Init state if empty
        sim, objects = init_trappist_1()
        current_system = system_name
    if sim is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Set time
    sim.integrate(t)

    # Gather positions
    positions = {objects[i]: get_position_dict(p) for i, p in enumerate(sim.particles)}

    # Gather orbital data for each object
    orbital_data = {objects[i]: get_osculating_orbit(sim, i) for i in range(len(sim.particles))}

    return {"positions": positions, "orbital_data": orbital_data}


def get_position_dict(particle):
    return {"x": particle.x, "y": particle.y, "z": particle.z}


def get_osculating_orbit(sim, i):
    """
    Given a REBOUND simulation, calculate:
    - Particle positions
    - Barycentric orbital information
        - Semi-major axis: AU
        - Eccentricity: -1 - 1
        - Longitude of the ascending node: radians (0-2pi)
        - Inclination: radians (0-2pi)
    """
    particle = sim.particles[i]

    total_mass = 0.0
    x = y = z = 0.0
    vx = vy = vz = 0.0

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
    https://rebound.hanno-rein.de/particles/orbitalelements/
    
    a 	semi-major axis
    e 	eccentricity
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