import signal
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import rebound
import os
import json

app = FastAPI()
templates = Jinja2Templates(directory="src/ui")

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
            # Control which components are rendered on the html page
            "navigation_bar": True,
            "system_dropdown": True,
            "logo": False,
            "sidebar_settings": True,
            "simulation_controls": True,
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

    # Total mass of the system
    total_mass = sum(p.m for p in sim.particles)

    # Gather orbital data excluding
    orbital_data = {}
    for i, p in enumerate(sim.particles):
        # Get the COM of the system
        com = sim.com()

        # Get the orbital elements relative to the primary
        # This may be inacurrate FIX LATER
        particle = sim.particles[i]
        primary = com
        orbit = particle.orbit(primary=primary)

        # Extract necessary parameters
        c = orbit.a * orbit.e         # Distance from focus to the geometric center

        # Absolute 3D coordinates of the orbit's geometric center
        center_x = primary.x - c * orbit.evec.x / e
        center_y = primary.y - c * orbit.evec.y / e
        center_z = primary.z - c * orbit.evec.z / e

        """
        https://rebound.hanno-rein.de/particles/orbitalelements/
        
        a 	semi-major axis
        e 	eccentricity
        inc 	inclination, in
        Omega 	longitude of ascending node, in
        omega 	argument of pericenter, in
        pomega 	longitude of pericenter, in
        f 	true anomaly, in
        M 	mean anomaly, in
        E 	Eccentric anomaly (in for ; unbounded for ). Because this requires solving Kepler's equation it is only calculated when needed in python and never calculated in C. To get the eccentric anomaly in C, use the function double reb_M_to_E(double e, double M)
        l 	mean longitude = Omega + omega + M, in
        theta 	true longitude = Omega + omega + f, in
        T 	time of pericenter passage
        rhill 	Hill radius,
        """
        orbital_data[objects[i]] = {
            "semi major": orbit.a,  # Longest radius of ellipse
            "eccentricity": orbit.e,  # Shape of ellipse
            "ascending longitude": orbit.Omega,  # Angle about the center axis
            "inclination": orbit.inc,  # Amount to tilt
            "pericenter argument": orbit.omega, # Argument of the pericenter
            "pericenter longitude": orbit.pomega,
            "true anomaly": orbit.f,
            "mean anomaly": orbit.M,
            "eccentric anomaly": orbit.E,
            "mean longitude": orbit.l,
            "pericenter passage time": orbit.T,
            "hill radius": orbit.rhill,
            "center": {
                "x": center_x,
                "y": center_y,
                "z": center_z,
            }
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
        "Halley's Comet",
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
