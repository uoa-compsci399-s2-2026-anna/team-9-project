@echo off

:: Check nvm exists
where nvm >nul 2>nul

if %errorlevel% neq 0 (
    echo nvm is not installed.
    echo Please install it and try again (may require a restart).
    start "" "https://www.nvmnode.com/"
    pause
    exit /b 1
)

:: Check if uv exists
where uv >nul 2>nul

if %errorlevel% neq 0 (
    echo uv is not installed.
    echo Please install it and try again (may require a restart).
    start "" "https://docs.astral.sh/uv/"
    pause
    exit /b 1
)

nvm install 24.22.1
nvm use 24.22.1
npm install -g npm@12.2.1
npm install

uv python install 3.15
uv python pin
uv sync

echo Done updating and installing utilities and packages
pause
