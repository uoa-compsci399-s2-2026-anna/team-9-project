# `config.json` References

## Solar System

Planets (Mecury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune) radius
and mass taken from: https://ssd.jpl.nasa.gov/planets/phys_par.html.

Units were converted to SI units via:
- Mass was multiplied by 10²⁴ and kept in kg
- Radius was converted km→m (×10³)

Halley's Comet mass sourced from Festou et al. 2004, "Comets II" (https://books.google.co.nz/books?id=AHF9ZraafV8C&pg=PA223&redir_esc=y#v=onepage&q=Halley&f=false)

Pluto's temperature was calculated from: https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html

Atlas' mass was take from: https://iopscience.iop.org/article/10.3847/2515-5172/ae2915

Solar system's habitable zone was sourced from https://arxiv.org/pdf/1205.2429#page=6.

Solar system's orbital periods were calculated via Rebound via data from the
NASA horizons API

All other data was taken from https://ssd.jpl.nasa.gov/horizons/

## Kepler-16

Data is taken from Doyle et al. 2011, "Kepler-16: A Transiting Circumbinary Planet", Science, 333, 1602
https://arxiv.org/abs/1109.3432

All data was sourced from: https://arxiv.org/pdf/1109.3432#page=13.

Units were converted to SI units via:
- Kelper-16A and B's mass were multiplied by the mass of the sun × 1.9891e30 kg (Nasa\*)
- Kelper-16A and B's radius were multiplied by the radius of the sun × 6.96e8 m (Nasa\*)
- Kepler-16b's mass was multiplied by the mass of Jupiter × 1.898125e27 kg (Nasa\*)
- Kelper-16b's radius was multiplied by the radius of Jupiter × 6.9911e7 m (Nasa\*)

Kepler-16's orbital periods were calculated via Rebound via data from the cited
paper above.

## TRAPPIST-1

Data is calculated from data given in Agol et al. 2021, "Refined masses and densities of the TRAPPIST-1 planets", The Astrophysical Journal, 922:107
https://arxiv.org/abs/2010.01074

Units were converted to SI units via:
- The star's mass were multiplied by the mass of the sun × 1.9891e30 kg (Nasa\*)
- The star's radius were multiplied by the radius of the sun × 6.96e8 m (Nasa\*)
- The planets' mass was multiplied by the mass of Jupiter × 1.898125e27 kg (Nasa\*)
- The planets' radius was multiplied by the radius of Jupiter × 6.9911e7 m (Nasa\*)

TRAPPIST-1's orbital periods were calculated via Rebound via data from the cited
paper above.

## Spreadsheet

https://docs.google.com/spreadsheets/d/1KE7ZVozelEonUsZPyBT29NdcSsfFrvfnJ53fg395jJ0/edit?usp=sharing
Accessible by anyone within the organisation
