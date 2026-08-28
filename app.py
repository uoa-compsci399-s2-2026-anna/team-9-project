import signal
import time
from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
import sys
import rebound
import os

app = FastAPI()

if sys.argv[-1] == "packaged":
    app.mount("/src", StaticFiles(directory="resources/src"), name="src")
    app.mount("/dist", StaticFiles(directory="resources/dist"), name="dist")
else:
    app.mount("/src", StaticFiles(directory="src"), name="src")
    app.mount("/dist", StaticFiles(directory="dist"), name="dist")

sim = None
valid_systems = ["solar"]
planets = []


@app.get("/kill")
async def kill():
    """
    API Endpoint to kill the application as CTRL+C does not always work
    """
    os.kill(os.getpid(), signal.SIGINT)


@app.get("/system")
async def get_system_data(name: str = "", t: int = -1):
    """
    GET /system endpoint
    """
    global sim
    global planet

    # Catch poor input
    if t == -1 or name.lower() not in valid_systems:
        raise HTTPException(status.HTTP_400_BAD_REQUEST)

    # Init state if empty
    if sim is None:
        init_solar()

    # Set time
    sim.integrate(float(t))

    # Gather positions
    positions = {}
    for i, p in enumerate(sim.particles):
        positions[planets[i]] = {"x": p.x, "y": p.y, "z": p.z}

    return {"positions": positions}


def init_solar():
    """
    Initialise solar system function
    """
    global sim
    global planets

    # Initialise the simulation
    sim = rebound.Simulation()

    sim.units = ("AU", "s", "Msun")

    # Add the sun at current position
    sim.add("Sun")

    # Move to COM of planets
    sim.move_to_com()

    # Add and set all planets
    planets = [
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

    for planet in planets[1:]:
        sim.add(planet)
