FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install && npm install -g appium

# Install Java (required for Appium Android automation)
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y openjdk-11-jdk;

RUN apt-get install -y android-tools-adb

# Create resources directory
RUN mkdir -p /opt/resources

CMD adb connect android:5555 && npx wdio run ./wdio.conf.js