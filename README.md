# team-9-project

COMPSCI 399 project repository for Team 9 - JEDEJ

## Releases

For pre-built installers for Windows, macOS, and Linux, see the [latest release](https://github.com/uoa-compsci399-s2-2026-anna/team-9-project/releases/latest) of OPIS.

### Publishing releases

OPIS releases follow [semantic versioning](https://semver.org/). To publish a release (e.g., `v2.1.3`), it is recommended to first bump the version in `package.json` and `pyproject.toml` to `2.1.3`. Afterwards, run `npm install` and `uv sync` to update the lockfiles, and commit the changes.

Then, from the current commit, create and push a version tag:

```
git tag v2.1.3
git push origin v2.1.3
```

### Auto-updater

OPIS features an auto-updater. When the application launches, users are notified if a new version is available and can install it directly. Auto-updating is not available on macOS as OPIS is not signed with an Apple Developer certificate, so macOS users need to download new versions manually.

## Installing locally

### Packages and dependencies

Required:

- [node.js][node] version `24.22.1`
- [npm][npm] version `12.2.1`
- [Python][python] version `3.12.x` (any patch version)
- [uv][uv] (any version)

Strongly recommended:

- [Node Version Manager][nvm] (any version)
  - Note: the Unix script referenced below will automatically install it

Choose one of the following methods to install the required tool and package
versions:

- [Installation by script](#installation-by-script) (Easiest)
- [Installation by commands](#installation-by-commands)
- [Manual installation](#manual-installation) (Not recommended and hardest)

#### Installation by script

Windows:

- Run `./scripts/windows_dependencies_install.bat`
  - [Node Version Manager][nvm] and [uv][uv] must be pre-installed. If they
    are not installed (and in the path environment variable) the script will not
    update or install the packages

Unix (macOS / linux):

- Run `./scripts/unix_dependencies_install.sh`
  - Will automatically install [`nvm`][nvm] and [`uv`][uv] if not installed
  - If [`nvm`][nvm] is installed but the script cannot find `nvm` set the
    bash variable `$NVM_DIR` to the path to where `nvm` is installed

#### Installation by commands

Node version manager is required for this method.

Install and use the [node][node] version `24.22.1`:

```sh
nvm install 24.22.1
nvm use 24.22.1
```

Install and use the [npm][npm] version `12.2.1`:

- Global installation (Preferred):
  - ```sh
    npm install -g npm@12.2.1
    ```
- Local installation:
  - ```sh
    npm install --save-dev npm@12.2.1
    ```

Note: `.npmrc` is responsible for strictly enforcing [node][node] and [npm][npm]
versions. Deleting it will allow for any version of `node` and `npm` to be used
so do so at your own risk.

Install and use the [Python][python] version `3.12`:

```sh
uv python install 3.12
uv python pin
```

Finally, install all required packages by runnning:

```sh
npm install
uv sync
```

#### Manual installation

This is highly inadvised but if preferred (or using something like NixOS)
follow the publicly avaliable guides to install the
[required](#packages-and-dependencies) [node.js][node], [npm][npm], and
[Python][python] versions and [uv][uv].

Then install all required packages by running:

```sh
npm install
uv sync
```

## Building and running

### Running OPIS

To run OPIS with [Electron](https://www.electronjs.org/docs/latest/), run:

```sh
npm run dev
```

### Running Tailwind

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

[uv]: https://docs.astral.sh/uv/#installation
[nvm]: https://www.nvmnode.com/guide/installation.html
[node]: https://nodejs.org/en/download
[npm]: https://www.npmjs.com/
[python]: https://www.python.org/downloads/
