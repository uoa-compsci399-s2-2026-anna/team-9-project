from datetime import datetime
from fastapi import FastAPI, HTTPException, Response, status, Request, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Annotated
from zoneinfo import ZoneInfo
import json
import os
import rebound
import signal
import sys
import time


def get_system_data_at_time(all_systems: dict, system_name: str, t: float) -> dict:
    """
    Gets a system at a specific sim time (set in config.json)
    Returns simulation data.
    """

    # Convert the system name to lowercase for API resilience
    system_name = system_name.lower()
    system_data = get_system_with_name(all_systems, system_name)

    # Catch poor input
    if system_data is None:
        print("ERROR:", system_name, "not found")
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    sim, objects = sims.get(system_name, (None, None))

    if sim is None or objects is None:
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


def get_position_dict(particle: rebound.Particle) -> dict:
    """
    Convert a particle to a dictionary of a positions
    """
    return {"x": particle.x, "y": particle.y, "z": particle.z}


def get_osculating_orbit(sim: rebound.Simulation, i: int) -> dict:
    """
    Given a REBOUND simulation, calculate:
    - Barycentric osculating orbital information
        - Semi-major axis: AU
        - Eccentricity: -1 - 1
        - Longitude of the ascending node: radians (0-2pi)
        - Inclination: radians (0-2pi)
    """
    particle: rebound.Particle = sim.particles.get(i)

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


def get_system_with_name(all_systems, name: str):
    name = name.lower()
    return next(
        system_data
        for system_data in all_systems
        if system_data["name"].lower() == name
    )


def init_system_with_name(name: str):
    return init_system(get_system_with_name(name), name)


