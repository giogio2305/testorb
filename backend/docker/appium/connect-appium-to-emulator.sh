#!/bin/bash

adb kill-server
adb start-server

sleep 5

# Always try to connect to the emulator container by hostname
adb connect mobile-e2e-android-1:5555
adb connect android:5555

MAX_WAIT=60
WAITED=0
while ! adb devices | grep -w "device" | grep -v "List"; do
  echo "Waiting for emulator device... ($WAITED/$MAX_WAIT seconds)"
  sleep 5
  WAITED=$((WAITED+5))
  adb devices
  adb connect mobile-e2e-android-1:5555
  adb connect android:5555
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "Timeout waiting for emulator device. Exiting."
    adb devices
    exit 1
  fi
done

echo "Emulator device detected:"
adb devices

# Install UiAutomator2 driver before starting Appium
appium driver install uiautomator2

# Start Appium server
echo "Starting Appium server..."
appium --log-level info --allow-insecure chromedriver_autodownload
