# FactTrace device firmware (ESP32)

One RGB LED and three buttons. The light shows the state of the check (never whether a claim is true); the buttons record the decision. Behaviour: [docs/device-signal-spec.md](../docs/device-signal-spec.md).

## Files

| File | What it is |
|---|---|
| `facttrace_device/facttrace_device.ino` | The firmware: settings at the top, wifi, polling, buttons, light |
| `facttrace_device/signals.h` | Colours and light patterns (one place to change them) |
| `facttrace_device/secrets.example.h` | Template for wifi and server address; copy to `secrets.h` (gitignored) |
| `test/test_signals.cpp` | Checks the patterns against the spec, including at most 3 flashes per second |
| `wokwi/diagram.json` | Wiring for the Wokwi simulator |

## Parts and wiring (ESP32-S2)

| Part | ESP32 pin | Other side |
|---|---|---|
| RGB LED red leg | GPIO 4, through a 220 Ω resistor | |
| RGB LED green leg | GPIO 5, through a 220 Ω resistor | |
| RGB LED blue leg | GPIO 6, through a 220 Ω resistor | |
| RGB LED common (long) leg | GND (common cathode) or 3.3V (common anode: set `COMMON_ANODE = true`) | |
| Trust button | GPIO 10 | GND |
| Unsure button | GPIO 11 | GND |
| Don't trust button | GPIO 12 | GND |
| Buzzer (optional, active) | GPIO 13 (+) | GND (−) |

Buttons need no resistors (the internal pull-up is used). Order on the box, left to right: **Trust · Unsure · Don't trust**. Pins can be changed at the top of the `.ino`; on the ESP32-S2 avoid GPIO 0, 45, 46 (boot) and 19, 20 (USB). On a classic ESP32 (not S2) GPIO 6 is used by the flash chip, so move blue to another pin, for example GPIO 25.

## Setup (Arduino IDE)

1. **Boards Manager:** install "esp32 by Espressif Systems" (tested to compile on versions 2.0.9 and 3.1.1).
2. **Board:** Tools → Board → ESP32 → "ESP32S2 Dev Module". Set Tools → "USB CDC On Boot" → Enabled, so Serial Monitor works over USB.
3. **Secrets:** copy `secrets.example.h` to `secrets.h` in the same folder and fill in:
   - the hotspot name and password (the laptop and the ESP32 on the same hotspot);
   - `SERVER_URL`: `http://<laptop ip>:3000/api`. Find the laptop ip with `ipconfig` (the IPv4 address of the hotspot or Wi-Fi adapter).
4. **Windows firewall:** allow Node.js on private networks (Windows asks the first time the backend starts), otherwise the ESP32 cannot reach port 3000.
5. Upload, open Serial Monitor at 115200. You should see `wifi ok, ip ...` and the light goes off (idle).

## Testing

**1. Light patterns on the computer (no ESP32):**
```
g++ -std=c++17 -o test_signals firmware/test/test_signals.cpp
./test_signals
```

**2. Demo mode (no backend):** set `DEMO_MODE = true`, upload. Every 4 s the light moves through idle, ready, checking, strong match, weak match, no match. A button press shows the recorded flash, or three short blinks during "checking" or "idle". Works the same in the Wokwi simulator: new ESP32-S2 project, paste the `.ino`, add `signals.h` and `secrets.example.h` as extra files, and replace `diagram.json` with `wokwi/diagram.json`.

**3. With the backend:** `DEMO_MODE = false`, backend running, then from PowerShell:
```
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/device/trial -ContentType "application/json" -Body '{"participantId":"P99","trialIndex":1,"claimId":"claim_31","condition":"app"}'
```
The light turns dim white (ready). Then:
```
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/verify -ContentType "application/json" -Body '{"claimText":"A WhatsApp video called Martinelli will hack your phone if you open it."}'
```
The light turns steady blue (strong match). Press a button: one white flash, light off, and
```
Invoke-RestMethod http://localhost:3000/api/device/status
```
shows `decisionRecorded: True` with the button you pressed. A second press shows three short blinks (already answered). Reset with `docker compose down -v` and `docker compose up -d` before real sessions, because P99 is now in `hardware_events`.

**4. With the app:** in the study flow the app does all of the above itself: `/device/trial` when the researcher taps Start Trial, `/device/status?waitForTrial=N&online=1` while it waits for the press (the backend holds each request up to 8 s, so the app sends a few requests per trial, not one every 300 ms), `/device/undo` when the participant taps Undo within 5 s of a press (the light goes back to the state before the press, no firmware change needed), and `/device/end` when the session ends or is left. The ESP32 should reach the backend directly on the hotspot (`http://<laptop ip>:3000/api`), not through ngrok: it polls about 200 times a minute, and ngrok's free plan allows 20,000 requests a month.
