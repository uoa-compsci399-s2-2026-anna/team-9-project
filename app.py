import signal
import time
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import sys
import rebound
import os
import json

app = FastAPI()
templates = Jinja2Templates(directory = "ui")

# Load the config file
with open("config.json") as f:
    config = json.load(f)

# Get the list of systems from the config
systems = config["systems"]

# Get the IDs of all the enabled systems
valid_systems = [
    system["id"]
    for system in systems
    if system["enabled"]
]

# Test output
print(systems)
print(valid_systems)

if sys.argv[-1] == "packaged":
    app.mount("/src", StaticFiles(directory="resources/src"), name="src")
    app.mount("/dist", StaticFiles(directory="resources/dist"), name="dist")
else:
    app.mount("/src", StaticFiles(directory="src"), name="src")
    app.mount("/dist", StaticFiles(directory="dist"), name="dist")

sim = None
# valid_systems = ["solar system"]
objects = []


@app.get("/kill")
async def kill():
    """
    API Endpoint to kill the application as CTRL+C does not always work
    """
    sim.stop()
    os.kill(os.getpid(), signal.SIGINT)


@app.get("/system")
async def get_system_data(system_id: str = "", t: float = 0.0):
    """
    GET /system endpoint
    """

    # Catch poor input
    if system_id not in valid_systems:
        raise HTTPException(status.HTTP_400_BAD_REQUEST)

    # Find the next requested system 
    system = next(
        system
        for system in systems
        if system["id"] == system_id
    )

    # Hardcode Solar System
    if system_id == "solar-system":

        # Init state if empty
        if sim is None:
            init_solar()

        # Set time
        sim.integrate(t)

        # Gather positions
        positions = {}
        for i, p in enumerate(sim.particles):
            positions[objects[i]] = {"x": p.x, "y": p.y, "z": p.z}

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
