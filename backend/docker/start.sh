#!/bin/bash
set -e

# Start Appium server
echo "Starting Appium server..."
appium --address 0.0.0.0 --port 4723 --allow-insecure chromedriver_autodownload &

# Wait a moment for Appium to initialize
sleep 5

echo "Appium server started. Keeping container alive..."

# Keep container running
tail -f /dev/null

emulator -avd ...

