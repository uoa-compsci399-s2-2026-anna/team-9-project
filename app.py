import signal
import time
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import sys
import rebound
import os
import json

rebound.horizons.SSL_CONTEXT = 'unverified'

app = FastAPI()
templates = Jinja2Templates(directory = "src/ui")

# Load the config file
with open("config.json") as f:
    config = json.load(f)

# Get the systems in the config 
all_systems = config["systems"]

app.mount("/src", StaticFiles(directory="src"), name="src")
app.mount("/dist", StaticFiles(directory="dist"), name="dist")

sim = None
objects = []

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context=
        {
            "systems": all_systems,
            "dropdown_systems": all_systems,

            # Control which components are rendered on the html page
            "navigation_bar": True,
            "system_dropdown": False,
            "logo": True,
            "sidebar_settings": False,
            "simulation_controls": False,
            "settings_overlay": True
        }
    )

@app.get("/simulation/{system_name}")
async def simulation(request: Request, system_name: str):

    # Get the current system
    current_system = next(
        system
        for system in all_systems
        if system["name"] == system_name
    )

    # Get all other systems, except the current system
    dropdown_systems = [
        system
        for system in all_systems
        if system["name"] != current_system["name"]
    ]

    return templates.TemplateResponse(
        request=request,
        name="simulation.html",
        context=
        {
            "systems": all_systems,
            "current_system": current_system,
            "dropdown_systems": dropdown_systems,

            # Control which components are rendered on the html page
            "navigation_bar": True,
            "system_dropdown": True,
            "logo": False,
            "sidebar_settings": True,
            "simulation_controls": True,
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

    # Catch poor input
    if not any(
        system["name"] == system_name
        for system in all_systems):
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    # Find the next requested system 
    system = next(
        system
        for system in all_systems
        if system["name"] == system_name
    )

    # Hardcode Solar System
    if system_name == "Solar System":

        # Init state if empty
        if sim is None:
            init_solar()

        print(t);

        # Set time
        sim.integrate(t)

        # Gather positions
        positions = {}
        for i, p in enumerate(sim.particles):
            positions[objects[i]] = {"x": p.x, "y": p.y, "z": p.z}

        print(positions)
        return {"positions": positions}


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
    sim.add("Sun")

    # Move to COM of the sun
    sim.move_to_com()

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
    ]

    for obj in objects[1:]:
        sim.add(obj)
