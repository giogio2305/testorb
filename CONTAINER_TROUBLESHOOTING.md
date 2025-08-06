# Container Troubleshooting Guide

## Common Issues and Solutions

### Issue: Appium Container Unhealthy

**Symptoms:**

-   Error: `dependency failed to start: container mobile-e2e-appium-1 is unhealthy`
-   Appium container shows as "unhealthy" in docker-compose ps

**Root Causes:**

1. **Port Conflicts**: The Android emulator container already runs Appium on port 4723
2. **ADB Connection Issues**: Appium container cannot connect to the Android emulator
3. **Timing Issues**: Appium starts before Android emulator is fully ready

**Solutions:**

#### 1. Check Container Status

```bash
docker-compose ps
docker-compose logs appium
docker-compose logs android
```

#### 2. Restart Containers in Proper Order

```bash
# Stop all containers
docker-compose down

# Start Android emulator first
docker-compose up -d android

# Wait for Android to be healthy (check with docker-compose ps)
# Then start Appium
docker-compose up -d appium

# Check health status
docker-compose ps
```

#### 3. Manual ADB Connection Test

```bash
# Connect to Appium container
docker-compose exec appium bash

# Test ADB connection
adb devices
adb connect mobile-e2e-android-1:5555
adb devices
```

#### 4. Check Appium Server Status

```bash
# Test Appium health endpoint
curl http://localhost:4724/status
```

### Issue: Android Emulator Unhealthy

**Symptoms:**

-   Android container shows as "unhealthy"
-   VNC not accessible on port 6080

**Solutions:**

#### 1. Check VNC Accessibility

```bash
# Test VNC endpoint
curl http://localhost:6080
```

#### 2. Increase Memory/CPU Resources

Edit docker-compose.yml:

```yaml
android:
    deploy:
        resources:
            limits:
                memory: 8G # Increase from 6G
                cpus: '3.0' # Increase from 2.0
```

#### 3. Check Emulator Logs

```bash
docker-compose logs android
```

### Issue: Test Execution Fails

**Symptoms:**

-   Tests fail with "dependency failed to start"
-   Cannot connect to Appium server

**Solutions:**

#### 1. Verify All Services Are Healthy

```bash
docker-compose ps
# Both android and appium should show "healthy"
```

#### 2. Test Appium Connection

```bash
# From test runner container
docker-compose run --rm app curl http://appium:4723/status
```

#### 3. Check Network Connectivity

```bash
# Test network connectivity between containers
docker-compose exec app ping android
docker-compose exec app ping appium
```

## Best Practices

### 1. Container Startup Sequence

1. Start Android emulator first: `docker-compose up -d android`
2. Wait for Android to be healthy (30-60 seconds)
3. Start Appium: `docker-compose up -d appium`
4. Wait for Appium to be healthy (15-30 seconds)
5. Run tests: `docker-compose run --rm app npx wdio run wdio.conf.js`

### 2. Resource Management

-   Ensure sufficient system resources (8GB+ RAM recommended)
-   Close other resource-intensive applications
-   Monitor container resource usage: `docker stats`

### 3. Debugging Commands

```bash
# View all container logs
docker-compose logs

# View specific service logs
docker-compose logs android
docker-compose logs appium

# Check container resource usage
docker stats

# Inspect container health
docker inspect mobile-e2e-android-1 | grep Health -A 10
docker inspect mobile-e2e-appium-1 | grep Health -A 10
```

### 4. Clean Restart

If issues persist:

```bash
# Complete cleanup
docker-compose down -v
docker system prune -f

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d android
# Wait for healthy status
docker-compose up -d appium
```

## Configuration Changes Made

### 1. Appium Health Check Fix

-   Changed from `http://android:4723/status` to `http://localhost:4723/status`
-   Increased health check intervals and retries
-   Added start_period for initial container startup

### 2. Enhanced Test Worker

-   Sequential container startup (Android first, then Appium)
-   Better error logging and diagnostics
-   Increased health check timeout to 3 minutes
-   Container log inspection on health failures

### 3. Appium Startup Script

-   Fixed duplicate Appium commands
-   Proper UiAutomator2 driver installation sequence
-   Enhanced logging and error handling
