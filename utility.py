import asyncio
from typing import cast

import rebound

# Whether we are integrating a simulation currently (empty lock)
is_integrating = asyncio.Lock()

# Whether heartbeat should stop
abort_integration = asyncio.Event()

_abort_count = 0

def get_abort_count() -> int:
    return _abort_count


async def begin_integrating():
    await is_integrating.acquire()
    abort_integration.clear()


async def end_integrating():
    global _abort_count
    _abort_count += 1
    if is_integrating.locked():
        abort_integration.set()


def done_integrating():
    """
    Run after integration is done and release locks.
    """
    # Declare that we are no longer integrating
    if is_integrating.locked():
        is_integrating.release()

    # Clear relevant events
    abort_integration.clear()


def heartbeat(sim_ptr):
    """
    Heartbeat function for rebound simulations occurs every timestep.
    Used to preempt simulation to stop integration.
    Called by rebound.
    """
    # If a thread has declared we should stop
    if abort_integration.is_set():
        # Get the sim from the cpointer that we are given by rebound
        sim = cast(rebound.Simulation, sim_ptr.contents)
        # Stop the simulation
        sim.stop()


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
        - Eccentricity: in (0, infinity)
        - Inclination: radians in [0, pi]
        - Longitude of the ascending node: radians in [0, 2pi)
        - Argument of pericenter: radians in [0, 2pi)
        - True anomaly: radians in [0, 2pi)
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
    
    a       semi-major axis
    e       eccentricity
    inc     inclination, in radians
    Omega   longitude of ascending node, in radians
    omega   argument of pericenter, in radians
    f       true anomaly, in radians
    """
    return {
        "a": orbit.a * total_mass / (total_mass + particle.m),
        "e": orbit.e,
        "inc": orbit.inc,
        "Omega": orbit.Omega,
        "omega": orbit.omega,
        "f": orbit.f,
    }
