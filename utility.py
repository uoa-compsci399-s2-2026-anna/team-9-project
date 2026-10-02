import asyncio
from typing import cast
import rebound


# Whether we are integrating a simulation currently (empty lock)
is_integrating = asyncio.Lock()
# Whether we are killing an integration by request currently (empty lock)
killing_integration = asyncio.Lock()
# Whether we are waiting for heartbeat to reach its next interval to stop
# currently (empty lock)
stopping_integration = asyncio.Lock()
# Whether the current simulation should stop integrating
# Faulty state: this is True and no sim is integrating right now
should_stop: bool = False


async def begin_integrating():
    """
    Stops all other running simulations to let this sim run.
    Also aquires necessary mutexes
    """
    # Declare that we are integrating right now
    await is_integrating.acquire()


def done_integrating():
    """
    Run after integration is done and release locks.
    """
    # If called from heartbeat() we should release this lock (as this will only
    # be locked if called from there)
    if stopping_integration.locked():
        stopping_integration.release()

    # Declare that we are no longer integrating
    is_integrating.release()


async def end_integrating():
    """
    Stop the currently integrating simulation if one is doing so currently.
    """
    # Only 1 request gets to stop integration at a time which prevents
    # should_stop being left in a faulty state (True when no integration is
    # running)
    async with killing_integration:
        # If we are current integrating, stop (via heartbeat callback)
        if is_integrating.locked():
            # Acquire the stopping integration lock so we can wait for heartbeat
            # to end integration on a seperate thread
            await stopping_integration.acquire()

            # Tell heartbeat to actually stop the current integration
            should_stop = True
        # If we are not integrating: do nothing
        else:
            return

        # Wait for heartbeat to finish stopping the current integration so that
        # we can check if we have been left in a faulty state
        async with stopping_integration:
            # If the heartbeat has managed to release the stopping integration
            # lock without actually stopping the integration
            if should_stop:
                # Theoretically unreachable code
                raise Exception("Failed to stop")


def heartbeat(sim_ptr):
    """
    Heartbeat function for rebound simulations occurs every timestep.
    Used to preempt simulation to stop integration.
    Called by rebound.
    """
    global should_stop

    # Get the sim from the cpointer that we are given by rebound
    sim = cast(rebound.Simulation, sim_ptr.contents)

    # If a thread has declared we should stop
    if should_stop:
        # Stop the simulation
        sim.stop()
        # We should no longer stop (i.e. run this code) until another request to
        # stop has been made
        should_stop = False
        # Release the locks declaring we are done with: stopping integration and
        # done with integrating in general
        done_integrating()


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
