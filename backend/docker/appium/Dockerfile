FROM appium/appium

USER root
COPY connect-appium-to-emulator.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/connect-appium-to-emulator.sh
RUN appium driver install uiautomator2
CMD /usr/local/bin/connect-appium-to-emulator.sh && /root/wireless_autoconnect.sh && /root/entry_point.sh