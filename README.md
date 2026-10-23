# team-9-project

COMPSCI 399 project repository for Team 9 - JEDEJ

## Install and setup

### Releases

For pre-built installers for Windows, macOS, and Linux, see the [latest release](https://github.com/uoa-compsci399-s2-2026-anna/team-9-project/releases/latest) of OPIS.

#### Publishing releases

OPIS releases follow [semantic versioning](https://semver.org/). To publish a release (e.g., `v2.1.3`), it is recommended to first bump the version in `package.json` and `pyproject.toml` to `2.1.3`. Afterwards, run `npm install` and `uv sync` to update the lockfiles, and commit the changes.

Then, from the current commit, create and push a version tag:

```
git tag v2.1.3
git push origin v2.1.3
```

#### Auto-updater

OPIS features an auto-updater. When the application launches, users are notified if a new version is available and can install it directly. Auto-updating is not available on macOS as OPIS is not signed with an Apple Developer certificate, so macOS users need to download new versions manually.

### Installing locally

#### Packages and Dependencies

It is recommended to use node.js version `24.20.0`.

node.js version `>=22.0.0` is required to be able to run OPIS. See [Node Version Manager](https://www.nvmnode.com/) on installing or updating node.

To install all required packages using [npm](https://www.npmjs.com) and [uv](https://docs.astral.sh/uv/), run:

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
