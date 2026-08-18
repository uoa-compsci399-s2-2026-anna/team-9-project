# team-9-project

COMPSCI 399 project repository for Team 9 - JEDEJ

# Building the Frontend

Install required packages from `package.json`

```
npm install
```

Run Tailwind CLI to build CSS files

```
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css
```
# Running the Python Web-server
## Installing the Packages
```sh
uv sync
```
Will install all dependencies (not this is unecessary if using `uv` to run the
program).

## Development Mode
```sh
uv run fastapi dev
```

## Python Only (with URL Override)
Windows
```sh
.venv\Scripts\activate
python3 main.py
```

Linux/MacOS
```sh
source .venv/bin/activate
python3 main.py
```

# Useful Links
- [`uv` Python Package Manager](https://github.com/astral-sh/uv)
- [`fastapi` Reference Docs](https://fastapi.tiangolo.com/)
