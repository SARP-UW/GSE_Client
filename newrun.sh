#!/bin/bash

set -e

echo "======================================
If this is your first time running
this document, go through the items
below sequentially.
======================================"

while true; do
    # Reset run flags
    run_part1=false
    run_part2=false
    run_software=false

    # ========================
    # START MENU
    # ========================
    echo "======================================"
    echo " Launch Operations Software"
    echo "======================================"
    echo "  1) SSH Key Setup"
    echo "  2) Environment Setup"
    echo "  3) Run Software"
    echo "  q) Quit"
    echo "======================================"
    read -p "Choose an option: " choice

    case "$choice" in
        1)
            run_part1=true
            ;;
        2)
            run_part2=true
            ;;
        3)
            run_software=true
            ;;
        q|Q)
            echo "Exiting."
            break
            ;;
        *)
            echo "Invalid option. Try again."
            continue
            ;;
    esac

    CURRENT_DIR="$(pwd)"
    KEY_FILE="$HOME/.ssh/id_ed25519"
    VENV_DIR="$CURRENT_DIR/venv"
    REQUIREMENTS_FILE="$CURRENT_DIR/requirements.txt"
    PYTHON_SCRIPT="$CURRENT_DIR/IGS/igs.py"
    OPENMCT_DIR="$CURRENT_DIR/openMCT"
    GC_DIR="$CURRENT_DIR/Ground-Control"
    IGS_DIR="$CURRENT_DIR/IGS"
    PI_IP="fillcontroller.local"  # Replace with your Pi’s IP or hostname
    PI_USER="pi"  # The user on the Pi

    # ========================
    # PART 1: SSH KEY SETUP
    # ========================
    if [ "$run_part1" = true ]; then
        echo
        echo "Running SSH Key Setup..."
        echo

        echo "Checking for existing SSH key..."
        if [ ! -f "$KEY_FILE" ]; then
            read -p "Enter your GitHub email: " email
            echo "Generating new SSH key..."
            ssh-keygen -t ed25519 -C "$email" -f "$KEY_FILE" -N ""
        else
            echo "SSH key already exists at $KEY_FILE"
        fi

        echo "Starting ssh-agent..."
        eval "$(ssh-agent -s)"

        if ! ssh-add -l | grep -q "$KEY_FILE"; then
            echo "Adding SSH key to ssh-agent..."
            ssh-add "$KEY_FILE"
        fi

        echo "Copying public SSH key to clipboard..."

        # Detect the OS and choose the appropriate copy command
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            pbcopy < "${KEY_FILE}.pub"
            echo -e "\033[0;32mYour SSH public key has been copied to the clipboard.\033[0m"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if ! command -v xclip &>/dev/null; then
                echo -e "\033[0;32mInstalling xclip...\033[0m"
                sudo apt install xclip
            fi
            xclip -sel clip < "${KEY_FILE}.pub"
            echo -e "\033[0;32mYour SSH public key has been copied to the clipboard.\033[0m"
        else
            echo -e "\033[0;31mUnsupported OS. This script only works on macOS and Linux.\033[0m"
        fi

        echo "Add your SSH key to GitHub here: https://github.com/settings/keys"
        echo

        # Setup SSH Key for Raspberry Pi
        echo "Setting up SSH access to the Raspberry Pi..."
        echo "Copying public SSH key to the Pi..."
        ssh-copy-id -i "${KEY_FILE}.pub" "$PI_USER@$PI_IP"

        if [ $? -eq 0 ]; then
            echo -e "\033[0;32mSSH key setup complete, passwordless SSH access to Raspberry Pi established.\033[0m"
        else
            echo -e "\033[0;31mERROR: Failed to set up passwordless SSH access.\033[0m"
            continue
        fi

    fi

    # ========================
    # PART 2: ENVIRONMENT SETUP
    # ========================
    if [ "$run_part2" = true ]; then
        echo
        echo "Verifying SSH access to GitHub..."
        echo

        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            echo -e "\033[0;32mSSH access to GitHub verified!\033[0m"
        else
            echo -e "\033[0;31mERROR: Unable to authenticate with GitHub via SSH.\033[0m"
            echo "Please make sure your SSH key has been added to your GitHub account and try again."
            echo
            continue
        fi

        echo "Running Environment Setup..."
        echo

        # Detect the OS to update package manager and install dependencies
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            # Install Homebrew if necessary
            echo "Checking for existing Homebrew installation..."
            if command -v brew &> /dev/null; then
                echo "Homebrew is already installed."
            else
                echo "Installing Homebrew to fallback location..."
                mkdir -p "$HOME/homebrew"
                git clone https://github.com/Homebrew/brew "$HOME/homebrew"
                export PATH="$HOME/homebrew/bin:$PATH"
            fi

            echo "Updating Homebrew..."
            brew update

            # Install dependencies
            echo "Installing Python 3..."
            brew install python || true

            echo "Installing Git..."
            brew install git || true
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            echo "Updating apt..."
            sudo apt update

            # Install dependencies
            echo "Installing Python 3..."
            sudo apt install python3 || true

            echo "Installing Git..."
            sudo apt install git || true
        fi

        # Install NVM
        if [ ! -d "$HOME/.nvm" ]; then
            echo "Installing NVM..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
        else
            echo "NVM is already installed, skipping installation."
        fi

        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        # Install Node.js version 6
        echo "Installing Node.js version 6 using NVM..."
        nvm install 6 || true
        nvm use 6

        echo
        echo -e "\033[0;32mEnvironment setup complete.\033[0m"
        echo
    fi

    # ========================
    # PART 3: RUN IGS, OPENMCT, AND GROUND CONTROL
    # ========================
    if [ "$run_software" = true ]; then
        # Check that the necessary directories exist
        if [ ! -d "$IGS_DIR" ] || [ ! -d "$OPENMCT_DIR" ] || [ ! -d "$GC_DIR" ]; then
            echo
            if [ ! -d "$IGS_DIR" ]; then
                echo -e "\033[0;31mERROR: IGS directory is missing.\033[0m"
            fi

            if [ ! -d "$OPENMCT_DIR" ]; then
                echo -e "\033[0;31mERROR: openMCT directory is missing.\033[0m"
            fi

            if [ ! -d "$GC_DIR" ]; then
                echo -e "\033[0;31mERROR: Ground-Control directory is missing.\033[0m"
            fi
            echo -e "\033[0;31mComplete the Environment Setup before running this software.\033[0m"

            echo
            continue
        fi

        # Start the controller script in the background on the Pi
        echo "SSHing into Raspberry Pi, activating virtualenv and running controller.py in the background..."
        ssh "$PI_USER@$PI_IP" << EOF &
cd /home/pi/controller
source .virtualenv/bin/activate
python3 /home/pi/controller/controller.py
EOF

        # This block will run async
        (
            # Waiting for server setup
            sleep 5
            echo
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                echo "Launching openMCT at http://localhost:8080..."
                open "http://localhost:8080"
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                if grep -qEi "(microsoft|wsl)" /proc/version &> /dev/null; then
                    # WSL2 (Windows Subsystem for Linux)
                    # Get WSL2 IP address (take only the first IP address from the eth0 interface)
                    WSL_IP=$(ip addr show eth0 | grep inet | awk '{print $2}' | head -n 1 | cut -d/ -f1)
                    echo "Launching openMCT at http://$WSL_IP:8080..."
                    explorer.exe http://$WSL_IP:8080
                else
                    # Non-WSL2 Linux
                    echo -e "\033[0;31mVerify that openMCT functions as expected in the browser.\033[0m"
                    echo "Launching openMCT at http://localhost:8080..."
                    xdg-open "http://localhost:8080"
                fi
            fi
        ) &

        # This block will run async
        (
            # Waiting for IGS
            sleep 3
            echo
            echo "Starting server..."
            cd "$CURRENT_DIR/openMCT" || exit
            source "$VENV_DIR/bin/activate"
            npm start
        ) > "$CURRENT_DIR/openmct.log" 2>&1 &


        # This block will run async
        (
            # Wait a few seconds for IGS script to run
            sleep 3
            echo
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                echo "Launching Ground Control at $GC_DIR/index.html"
                open "$GC_DIR/index.html"
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                # WSL2 (Windows Subsystem for Linux)
                echo "Launching Ground Control at file://wsl.localhost/Ubuntu$GC_DIR/index.html"
                explorer.exe file://wsl.localhost/Ubuntu$GC_DIR/index.html
            fi
        ) &

        echo
        echo "Running igs.py"
        cd "$CURRENT_DIR"
        source "$VENV_DIR/bin/activate"
        python3 "$PYTHON_SCRIPT"

        echo
    fi

    echo "======================================"
    echo "Operation(s) complete. Returning to menu..."
    echo "======================================"
    echo
done
