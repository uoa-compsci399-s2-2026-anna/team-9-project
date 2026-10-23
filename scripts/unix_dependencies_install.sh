#!/bin/bash

install_pkg() {
	while true; do
		read -p "Do you wish to install $1? (y/n): " -e 1 -r
		echo

		case "$REPLY" in
			[Yy]* )
				echo "Installing $1..."
				break
				;;
			[Nn]* )
				echo "Please manually install $1 then."
				exit 1
				break
				;;
			* )
				echo "Please enter 'y' or 'n'"
				;;
		esac
	done
}

if ! command -v curl &> /dev/null; then
	echo "fatal: curl not installed!"
	exit 1
fi

if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

# If nvm is not installed
if ! command -v nvm &> /dev/null; then
	echo "nvm is not installed"
	install_pkg nvm
	curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | sh

	# Refresh bash/zsh
	if [ -n "$BASH_VERSION" ]; then
	    source ~/.bashrc
	elif [ -n "$ZSH_VERSION" ]; then
	    source ~/.zshrc
	fi

	# If the command is still not installed
	if ! command -v nvm &> /dev/null then
		echo "Please restart your bash session"
		exit 0
	fi
fi

# If uv is not installed
if ! command -v uv &> /dev/null; then
	echo "uv is not installed"
	install_pkg uv
	curl -LsSf https://astral.sh/uv/install.sh | sh

	# Refresh bash/zsh
	if [ -n "$BASH_VERSION" ]; then
	    source ~/.bashrc
	elif [ -n "$ZSH_VERSION" ]; then
	    source ~/.zshrc
	fi

	# If the command is still not installed
	if ! command -v uv &> /dev/null then
		echo "Please restart your bash session"
		exit 0
	fi
fi

nvm install 24.22.1
nvm use 24.22.1
npm install -g npm@12.2.1
npm install

uv python install 3.15
uv python pin
uv sync
