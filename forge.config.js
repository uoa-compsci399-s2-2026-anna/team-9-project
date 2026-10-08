const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

module.exports = {
    packagerConfig: {
        name: "OPIS",
        // .deb and .rpm makers expect a lowercase executable name
        executableName: process.platform !== "linux" ? "OPIS" : "opis",
        asar: true,
        extraResource: ["./dist/", "./src/", "./config.json"],
        ignore: [
            /^\/\.git/,
            /^\/\.github/,
            /^\/\.venv/,
            /^\/__pycache__/,
            /^\/\.node_modules/,
            /^\/\.gitignore/,
            /^\/\.prettierrc/,
            /^\/\.python-version/,
            /^\/pyproject\.toml/,
            /^\/uv\.lock/,
        ],
        icon: "src/assets/app-icon/opis",
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
                iconUrl:
                    "https://raw.githubusercontent.com/uoa-compsci399-s2-2026-anna/team-9-project/db4d16494d244d017a13e71b6d324547730f5985/src/assets/app-icon/opis.ico",
                // The ICO file to use as the icon for the generated Setup.exe
                setupIcon: "src/assets/app-icon/opis.ico",
                loadingGif: "src/assets/installation-screen/opis.gif",
            },
        },
        {
            name: "@electron-forge/maker-dmg",
            config: {
                icon: "src/assets/app-icon/opis.icns",
            },
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                options: {
                    icon: "src/assets/app-icon/opis.png",
                },
            },
        },
        {
            name: "@electron-forge/maker-rpm",
            config: {
                options: {
                    icon: "src/assets/app-icon/opis.png",
                },
            },
        },
    ],
    plugins: [
        {
            name: "@electron-forge/plugin-auto-unpack-natives",
            config: {},
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
    hooks: {
        // Application crashes on macOS if it is not signed correctly
        postPackage: async (_forgeConfig, options) => {
            if (options.platform !== "darwin") {
                return;
            }

            for (const appPath of options.outputPaths) {
                // Find the .app bundle inside this output directory
                const appBundle = fs
                    .readdirSync(appPath)
                    .find((f) => f.endsWith(".app"));

                if (appBundle) {
                    const fullPath = path.join(appPath, appBundle);
                    // Sign the application with an ad-hoc signature
                    execSync(`codesign --force --deep --sign - "${fullPath}"`);
                }
            }
        },
    },
};
