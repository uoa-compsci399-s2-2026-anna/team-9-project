# `config.json` References

## Solar System

Planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune) radius and mass are taken from: https://ssd.jpl.nasa.gov/planets/phys_par.html

Units are converted to SI units via:
- Mass is multiplied by $10^{24}$ and kept in kg
- Radius is converted from km to m ($\times 10^3$)

Halley's Comet mass is sourced from Festou et al. 2004, "Comets II" (https://books.google.co.nz/books?id=AHF9ZraafV8C&pg=PA223&redir_esc=y#v=onepage&q=Halley&f=false)

Pluto's temperature is calculated from: https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html

ATLAS' mass is taken from: https://iopscience.iop.org/article/10.3847/2515-5172/ae2915

Solar system's habitable zone is sourced from: https://arxiv.org/pdf/1205.2429#page=6

Solar system's orbital periods is calculated in REBOUND using data from the NASA Horizons API.

All other data is taken from: https://ssd.jpl.nasa.gov/horizons/

## Kepler-16

Data is taken from Doyle et al. 2011, "Kepler-16: A Transiting Circumbinary Planet", Science, 333, 1602
https://arxiv.org/abs/1109.3432

All data is sourced from: https://arxiv.org/pdf/1109.3432#page=13

Units are converted to SI units via conversions sourced from NASA:
- Kelper-16A and B's mass are multiplied by the mass of the sun ($1.9891 \times 10^{30}$ kg)
- Kelper-16A and B's radius are multiplied by the radius of the sun ($6.96 \times 10^8$ m)
- Kepler-16b's mass is multiplied by the mass of Jupiter ($1.898125 \times 10^{27}$ kg)
- Kelper-16b's radius is multiplied by the radius of Jupiter ($6.9911 \times 10^7$ m)

Kepler-16's orbital periods are calculated in REBOUND using data from the cited paper above.

Kepler-16's habitable zones are from: https://arxiv.org/pdf/1306.2890#page=26

Kepler-16's star temperatures are from: https://arxiv.org/html/1802.06856v2#S3

## TRAPPIST-1

Data is calculated from data given in Agol et al. 2021, "Refined masses and densities of the TRAPPIST-1 planets", The Astrophysical Journal, 922:107
https://arxiv.org/abs/2010.01074

Units are converted to SI units via conversions sourced from NASA:
- The star's mass is multiplied by the mass of the sun ($1.9891 \times 10^{30}$ kg)
- The star's radius is multiplied by the radius of the sun ($6.96 \times 10^8$ m)
- The planets' masses are multiplied by the mass of Jupiter ($1.898125 \times 10^{27}$ kg)
- The planets' radii are multiplied by the radius of Jupiter ($6.9911 \times 10^7$ m)

TRAPPIST-1's orbital periods are calculated in REBOUND using data from the cited paper above.

TRAPPIST-1's habitable zone is given by Dr. Larissa Markwardt (Research Fellow in the Department of Physics at the University of Auckland) and verified with Figure 1 of: https://arxiv.org/pdf/1702.06936#page=2

## Spreadsheet
This [spreadsheet](https://docs.google.com/spreadsheets/d/1KE7ZVozelEonUsZPyBT29NdcSsfFrvfnJ53fg395jJ0/edit?usp=sharing) containing unit conversions is accessible by anyone within the organisation
