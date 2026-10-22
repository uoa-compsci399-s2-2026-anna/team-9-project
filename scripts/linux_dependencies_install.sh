#!/bin/bash

install_pkg() {
	read -p "Do you wish to install $1? (y/n): " -n 1 -r
	echo

	if [[ $REPLY =~ ^[Yy]$ ]]; then
		echo "Installing $1..."
	else
		echo "Please enter y/n. Exiting..."
		exit 1
	fi
}

if ! command -v curl &> /dev/null; then
	echo "fatal: curl not installed!"
	exit 1
fi

if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

if ! command -v nvm &> /dev/null; then
	echo "nvm is not installed"
	install_pkg nvm
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | sh
fi

if ! command -v uv &> /dev/null; then
	echo "uv is not installed"
	install_pkg uv
	curl -LsSf https://astral.sh/uv/install.sh | sh
fi

nvm install 24.22.1
nvm use 24.22.1
npm install -g npm@12.2.1
npm install

uv python install 3.15
uv python pin
uv sync
