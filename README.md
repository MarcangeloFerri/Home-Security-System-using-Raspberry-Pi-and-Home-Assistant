# Privacy-First Home Security System

A robust home security and surveillance system running on Home Assistant OS. The core logic, presence detection, and alarms are processed locally for maximum reliability, while allowing secure management and control through a custom-built, modern web dashboard.

## Phase 1: Presence Detection
In the first phase, we have set up the server and created reliable, local presence detection via Bluetooth (BLE) in an apartment with concrete walls. The system automatically knows when someone arrives or leaves home.

### Hardware
* **Server:** Raspberry Pi 5 (8GB RAM)
* **Power Supply:** Official Raspberry Pi 27W USB-C PSU
* **Storage (Temporary):** MicroSD card (for Home Assistant OS)
* **Presence Sensor:** Shelly BLU Button1 (acts as a BLE Beacon on the keychain)

### Software & Configuration
1. **OS:** Home Assistant OS flashed via Raspberry Pi Imager.
2. **Sensor Setup:**
   * The Shelly button was updated and put into "Beacon Mode" via the Shelly BLE Debug tool to send continuous pulses.
   * Integrated locally into Home Assistant via the BTHome integration.
   * The hidden sensor for signal strength (RSSI) was manually enabled for monitoring.

### Presence Logic (Home/Away)
Since BLE devices do not send a "disconnected" signal when leaving the area, a time-based logic was built to determine presence.
* **Helper (Input Boolean):** Created a virtual switch (`Nyckelknippa Hemma`) to store the current status of the key.
* **Automation 1 (Arrival):**
  * *Trigger:* The signal strength sensor updates (receives a new value).
  * *Condition:* The helper is currently set to "Off".
  * *Action:* Turns the helper "On" (The alarm is deactivated).
* **Automation 2 (Departure):**
  * *Trigger:* A Template sensor that monitors when the signal was last seen. If the sensor has not updated in exactly 5 minutes, the automation is triggered.
    ```yaml
    {{ now() - states.sensor.shelly_blu_button1_263a_signalstyrka.last_updated > timedelta(minutes=5) }}
    ```
  * *Action:* Turns the helper "Off" (The alarm is activated).

---

## Phase 2: Perimeter Security (Matter over Thread)
In the second phase, the system was expanded with local door and window sensors. To maintain a strict local environment without relying on third-party commercial hubs, a custom Thread Border Router was built from scratch to support modern Matter devices.

### Hardware Added
* **Thread Border Router:** Sonoff ZBDongle-E (Zigbee 3.0 USB Dongle Plus V2)
* **Door/Window Sensor:** IKEA MYGGBETT (Matter over Thread)

### Software & Configuration
1. **Firmware Flashing:**
   * The Sonoff ZBDongle-E was flashed from its factory Zigbee firmware to **OpenThread RCP** (v2.4.4) using the official Sonoff Web Flasher.
2. **OpenThread Border Router (OTBR):**
   * Installed the OTBR add-on in Home Assistant.
   * Configured the device serial path (`/dev/serial/by-id/...`), set the baud rate to `460800`, and disabled hardware flow control.
   * Manually exposed the internal REST API port (`8081`) in the add-on network settings to allow communication with the Home Assistant core.
3. **Thread & Matter Integration:**
   * Connected the native Home Assistant Thread integration to the local OTBR using the API URL: `http://localhost:8081`.
   * Installed and started the Matter Server add-on.
   * Synced the local Thread network credentials to the Android mobile device via the Home Assistant Companion App. This critical step ensures the smartphone can securely pass the network keys to new Matter devices during pairing.
4. **Device Pairing:**
   * The IKEA MYGGBETT sensor was factory-reset and paired directly into Home Assistant via the Matter integration, providing instantaneous status updates (Open/Closed) for the alarm logic.

---

## Phase 3: Custom Web Dashboard & Middleware API
To improve accessibility and provide a dedicated user interface for the security system, a custom web dashboard was built from scratch and integrated directly into Home Assistant.

### Tech Stack
* **Frontend:** Next.js, React, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Integration:** Home Assistant REST API via Long-Lived Access Tokens

### Features & Configuration
1. **Scalable Master Sensor Logic:**
   * Implemented a Jinja2 template binary sensor (`binary_sensor.alla_nycklar`) that aggregates the presence of multiple keys. The system evaluates this master sensor to "On" if *any* family member is home, intelligently handling the auto-arming and disarming logic without redundant automations.
2. **Dedicated Control Panel (Next.js):**
   * Designed a responsive, modern UI using Tailwind CSS that displays real-time system status.
   * Utilizes parallel data fetching to ensure immediate and synchronized UI updates for the main alarm, night mode status, and aggregated presence indicators.
3. **Secure Middleware (Express.js):**
   * Acts as a secure bridge between the frontend and the Home Assistant REST API.
   * Handles API requests (`turn_on`, `turn_off`, `get_states`) while keeping authentication tokens and local IP configurations protected on the server side (excluded from version control via `.gitignore`).
4. **Seamless Home Assistant Integration:**
   * The web application is served locally and embedded directly into the Home Assistant sidebar using the `panel_iframe` configuration, creating a unified experience across mobile and desktop devices.
