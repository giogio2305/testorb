#!/bin/bash

# Ensure dependencies are installed (in case of volume mount)
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
    echo "Installing/updating dependencies..."
    npm install
fi

# Connexion ADB persistante
echo "Connecting to Android emulator..."
adb connect mobile-e2e-android-1:5555

# Attendre la connexion
while ! adb devices | grep -w "device" | grep -v "List"; do
  echo "Waiting for emulator connection..."
  sleep 2
  adb connect mobile-e2e-android-1:5555
done

echo "Emulator connected successfully"

# Démarrer le serveur de tests
node test-server.js
