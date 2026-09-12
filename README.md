# team-9-project

COMPSCI 399 project repository for Team 9 - JEDEJ

# Running Electron
## Packages and Dependencies
`node.js` version `>=22.0.0` is required to be able to run this and higher
versions are recommended.
- See [node version manager](https://www.nvmnode.com/) on updating or installing node

To install packages run:
```sh
npm install
```

## Running electron
To run the program use:
```sh
npm run dev
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
uv run main.py
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

## Useful Links
- [`uv` Python Package Manager](https://github.com/astral-sh/uv)
- [`fastapi` Reference Docs](https://fastapi.tiangolo.com/)

# Building Everything
The final executable lives in the `./out/team-9-project-OS-ARCH/` folder **not** the `./dist/` folder.

## Linux/MacOS
Tested with `node.js` version `v24.20.0`
```sh
rm -rf build dist out
uv sync
npm run package-py-unix
npm install
npm run tailwind
npm run make
```
Example output executable path: `./out/team-9-project-linux-x64/team-9-project`

## Windows
Tested with `node.js` version `v24.20.0`
```sh
rd /s /q build dist out
uv sync
npm run package-py-win
npm install
npm run tailwind
npm run make
```
Example output executable path: `./out/team-9-project-win32-x64/team-9-project.exe`


# Building the Frontend

Install required packages from `package.json`

```
npm install
```

Run Tailwind CLI to build CSS files

```
npm run watch
```

This runs `npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch`

# Useful Links
- [node version manager](https://www.nvmnode.com/)
- [`electron` Reference Docs](https://www.electronjs.org/docs/latest/)
