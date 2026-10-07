import asyncio
import threading
from typing import cast
import rebound


is_integrating = asyncio.Lock()

# Stores whether or not integration should be aborted (interrupted/stopped)
abort_integration = threading.Event()


def check_sim_was_stopped() -> bool:
    """
    Check's if the sim that just ran was stopped during integration.
    Resets the value to False.
    """
    global sim_was_stopped
    has_been_stopped, sim_was_stopped = sim_was_stopped, False
    return has_been_stopped


async def begin_integrating():
    global sim_was_stopped
    await is_integrating.acquire()

    # Clear stale state
    abort_integration.clear()
    sim_was_stopped = False


def done_integrating():
    # We are no longer integrating
    # Note: based on how I am using this function there is no need to check if
    # the lock is actually locked, but feel free to add this check
    is_integrating.release()


def request_abort():
    # Ask the currently running integration (if any) to stop early
    if is_integrating.locked():
        abort_integration.set()


def heartbeat(sim_ptr):
    global sim_was_stopped

    # Stop the simulation if there was a request to abort integration
    if abort_integration.is_set():
        sim = cast(rebound.Simulation, sim_ptr.contents)
        sim.stop()
        abort_integration.clear()
        sim_was_stopped = True


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
