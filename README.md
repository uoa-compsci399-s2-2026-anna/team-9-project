# team-9-project

COMPSCI 399 project repository for Team 9 - JEDEJ

## Install and setup

### Releases

For pre-built installers for Windows, macOS, and Linux, see the OPIS [releases](https://github.com/uoa-compsci399-s2-2026-anna/team-9-project/releases).

### Installing locally

#### Packages and Dependencies

Required:

- node.js version `24.22.1`
- npm version `12.2.1`
- Python version `3.15.x` (any patch version)
- [uv](https://docs.astral.sh/uv/) (any version)

Strongly Recommended:

- [Node Version Manager](https://www.nvmnode.com/) (any version)
  - Note: the Unix script referenced below will automatically install it

##### Installation by Script

Windows:

- Run `./scripts/windows_dependencies_install.bat`
  - [Node Version Manager](https://www.nvmnode.code/) and
    [uv](https://docs.astral.sh/uv/) must be pre-installed and the script will
    do nothing if not installed (and in path)

Unix (macOS / linux):

- Run `./scripts/unix_dependencies_install.sh`
  - Will automatically install `nvm` and `uv` if not installed
  - If `nvm` is installed but it cannot find it set the environment variable
    `$`

##### Installation by Commands

Node version manager is required to do this.

Install and use the node version:

```sh
nvm install 24.22.1
nvm use 24.22.1
```

Install and use the npm version:

Global npm installation (Preferred):
```sh
npm install -g npm@12.2.1
```

Local npm installation:
```sh
npm install --save-dev npm@12.2.1
```

Note: `.npmrc` is responsible for strictly enforcing node and npm versions.

Install and use the Python version:

```sh
uv python install 3.15
uv python pin
```

Finally, install all required packages by runnning:

```sh
npm install
uv sync
```

##### Manual Installation

This is highly unrecommended but if preferred (or using something like NixOS)
follow guides to install the correct node.js, npm, and Python versions and uv.

Then install all required packages by running:

```sh
npm install
uv sync
```

### Building and running

#### Running OPIS

To run OPIS with [Electron](https://www.electronjs.org/docs/latest/), run:

```sh
npm run dev
```

#### Running Tailwind

To automatically run [Tailwind](https://tailwindcss.com) on file changes:

```sh
npm run watch
```

## Packaging

The final executable lives in the `./out/team-9-project-OS-ARCH/` folder, **not** the `./dist/` folder.

Tested with node.js version `v24.20.0`. Certain later versions of node.js may not work.

### Linux/macOS

```sh
rm -rf build dist out
uv sync
npm run package-py-unix
npm install
npm run tailwind
npm run make
```

Example output executable path: `./out/team-9-project-linux-x64/team-9-project`

### Windows

```sh
rd /s /q build dist out
uv sync
npm run package-py-win
npm install
npm run tailwind
npm run make
```

Example output executable path: `./out/team-9-project-win32-x64/team-9-project.exe`

## Logging

Log files are written to:

- on Linux: `~/.config/{app name}/logs/<date>_main.log`
- on macOS: `~/Library/Logs/{app name}/<date>_main.log`
- on Windows: `%USERPROFILE%\AppData\Roaming\{app name}\logs\<date>_main.log`
  Where `<date>` is in `YYYY-MM-DD_HH-MM-SS` format
