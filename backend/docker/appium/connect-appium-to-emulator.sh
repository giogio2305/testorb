#!/bin/bash
set -e

echo "🚀 Starting Appium-Emulator connection script..."

# Wait for Android container to be ready
echo "⏳ Waiting for Android emulator to be ready..."
sleep 10

# Initialize ADB
echo "🔧 Initializing ADB server..."
adb kill-server || true
adb start-server

# Connection attempts with better error handling
echo "🔗 Attempting to connect to emulator..."
for i in {1..5}; do
    echo "📱 Connection attempt $i/5..."

    # Try connecting to both possible addresses
    if adb connect mobile-e2e-android-1:5555 2>/dev/null || adb connect mobile-e2e-android-1:5555 2>/dev/null; then
        echo "✅ ADB connection established"
        break
    else
        echo "❌ Connection attempt $i failed, retrying in 3 seconds..."
        sleep 3
    fi

    if [ $i -eq 5 ]; then
        echo "🔍 Final attempt failed. Checking diagnostics..."

        # Check if port 5555 is available using ss instead of netstat
        echo "📊 Checking port 5555 status:"
        ss -tuln | grep :5555 || echo "Port 5555 not found"

        # Check container status
        echo "📋 Container status:"
        docker ps | grep android || echo "No android container found"

        echo "⚠️ Could not establish ADB connection after 5 attempts"
    fi
done

# Optimized boot completion check
echo "⏳ Waiting for emulator boot completion..."
boot_timeout=60  # Reduced from 120 seconds (24*5) to 60 seconds
check_interval=2  # Reduced from 5 seconds to 2 seconds
max_checks=$((boot_timeout / check_interval))

for i in $(seq 1 $max_checks); do
    # Check multiple boot indicators for faster detection
    if adb shell getprop sys.boot_completed 2>/dev/null | grep -q "1" && \
       adb shell getprop init.svc.bootanim 2>/dev/null | grep -q "stopped"; then
        echo "✅ Emulator boot completed (check $i/$max_checks)"
        break
    fi

    # Show progress less frequently to reduce noise
    if [ $((i % 5)) -eq 0 ] || [ $i -eq $max_checks ]; then
        echo "⏳ Boot check $i/$max_checks, waiting $check_interval seconds..."
    fi

    sleep $check_interval

    # If we reach the last check, warn but don't fail
    if [ $i -eq $max_checks ]; then
        echo "⚠️ Boot check timeout reached, but continuing (emulator might still be usable)"
    fi
done

# Quick additional check for UI readiness
echo "🎯 Performing quick UI readiness check..."
for i in {1..5}; do
    if adb shell dumpsys window 2>/dev/null | grep -q "mCurrentFocus"; then
        echo "✅ UI is ready"
        break
    fi
    sleep 1
done

# Reconnect every 30 seconds to maintain connection
echo "🔄 Setting up connection maintenance..."
(
    while true; do
        sleep 30
        if ! adb devices | grep -q "5555.*device"; then
            echo "🔄 Reconnecting ADB..."
            adb connect mobile-e2e-android-1:5555 2>/dev/null || adb connect mobile-e2e-android-1:5555 2>/dev/null || true
        fi
    done
) &

# Install UiAutomator2 driver safely
echo "📦 Installing UiAutomator2 driver..."
if ! appium driver install uiautomator2 2>/dev/null; then
    echo "⚠️ UiAutomator2 driver installation failed or already installed"
fi

# Start Appium server with compatible parameters only
echo "🚀 Starting Appium server..."
exec appium \
    --address 0.0.0.0 \
    --port 4723 \
    --allow-insecure chromedriver_autodownload \
    --allow-cors \
    --log-level warn \
    --session-override
