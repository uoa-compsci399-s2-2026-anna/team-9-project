const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

module.exports = {
    packagerConfig: {
        name: 'team-9-project',
        asar: true,
        extraResource: [
            './dist/',
            './src/',
            './config.json',
        ],
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
        icon: [
            "/src/assets/opis.icon"
        ]
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {},
        },
        {
            name: '@electron-forge/maker-dmg',
            config: {},
        },
        {
            name: '@electron-forge/maker-deb',
            config: {},
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {},
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
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
            if (options.platform !== 'darwin') {
                return;
            }

            for (const appPath of options.outputPaths) {
                // Find the .app bundle inside this output directory
                const appBundle = fs
                    .readdirSync(appPath)
                    .find((f) => f.endsWith('.app'));

                if (appBundle) {
                    const fullPath = path.join(appPath, appBundle);
                    // Sign the application with an ad-hoc signature
                    execSync(`codesign --force --deep --sign - "${fullPath}"`);
                }
            }
        },
    },
};

