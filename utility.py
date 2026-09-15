import rebound


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
