@echo off

:: Check nvm exists
where nvm >nul 2>nul

if %errorlevel% neq 0 (
    echo "nvm is not installed."
    echo "Please install it and try again (may require a full restart)."
    echo "Opening https://www.nvmnode.com/"
    start "" "https://www.nvmnode.com/"
    pause
    exit /b 1
)

:: Check if uv exists
where uv >nul 2>nul

if %errorlevel% neq 0 (
    echo "uv is not installed."
    echo "Please install it and try again (may require a full restart)."
    echo "Opening https://docs.astral.sh/uv/"
    start "" "https://docs.astral.sh/uv/"
    pause
    exit /b 1
)

echo Updating node and npm
call nvm install 24.22.1
call nvm use 24.22.1
call npm install -g npm@12.2.1
call npm install

echo Updating python and uv
call uv python install 3.12
call uv python pin
call uv sync

echo Done updating and installing utilities and packages
pause
