# Privacy-First Home Security System (Local-Only)

A completely local and cloud-free home security and surveillance system running on Home Assistant OS. The system handles presence detection and alarms automatically without relying on external servers or cloud services.

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
