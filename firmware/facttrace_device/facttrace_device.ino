//facttrace device: esp32 with one rgb led and three buttons (trust, unsure, don't trust)
//shows the state of the check (never whether a claim is true) and records the participant's decision
//behaviour follows docs/device-signal-spec.md; light patterns are in signals.h
//
//setup: copy secrets.example.h to secrets.h and fill in the wifi and server address
//board: "ESP32S2 Dev Module" (any esp32 works) or "NodeMCU 1.0 (ESP-12E Module)" for the esp8266 nodemcu; pins below change with the board
//test without a backend: set DEMO_MODE to true, it cycles through every light state (also works in wokwi)

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#else
#include <WiFi.h>
#include <HTTPClient.h>
#endif
#include <WiFiClientSecure.h>
#include "signals.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#warning "secrets.h not found, using secrets.example.h (copy it to secrets.h and fill it in)"
#include "secrets.example.h"
#endif

//---- settings ----
const char* DEVICE_ID = "dev1";       //sent with every request
const bool DEMO_MODE = false;         //true: no wifi, cycles through the states every 4 s
const bool BUZZER_ON = false;         //group decision: one short beep on a recorded press
const bool COMMON_ANODE = false;      //true if the led's long leg goes to 3.3V instead of GND

#if defined(ESP8266)
//pins on the esp8266 nodemcu, as printed on the back (IO14 = 14). avoid IO0, IO15 (boot), IO16 (no pull-up, no pwm), RX and TX (usb serial)
const int PIN_RED = 14;               //D5
const int PIN_GREEN = 12;             //D6
const int PIN_BLUE = 13;              //D7
const int PIN_TRUST = 5;              //D1. buttons connect the pin to GND when pressed (internal pull-up)
const int PIN_UNSURE = 4;             //D2
const int PIN_DONT_TRUST = 2;         //D4 (high at boot is fine; the small blue board led lights while it is pressed)
const int PIN_BUZZER = 15;            //D8, active buzzer (beeps when the pin is high); low at boot, which the buzzer keeps
#else
//pins (esp32-s2: avoid 0, 45, 46 which are boot pins, and 19, 20 which are usb)
const int PIN_RED = 4;
const int PIN_GREEN = 5;
const int PIN_BLUE = 6;
const int PIN_TRUST = 10;             //buttons connect the pin to GND when pressed (internal pull-up)
const int PIN_UNSURE = 11;
const int PIN_DONT_TRUST = 12;
const int PIN_BUZZER = 13;            //active buzzer (beeps when the pin is high)
#endif

//timing (spec: poll every 300 ms, 50 ms debounce, offline after about 2 s without an answer)
const uint32_t POLL_MS = 300;
const uint32_t DEBOUNCE_MS = 50;
const uint32_t HTTP_TIMEOUT_MS = 1500;
const int FAILS_BEFORE_OFFLINE = 3;   //3 failed polls in a row: about 1 s if the server is down, up to about 5 s if requests time out
const int PRESS_RETRIES = 3;          //retries on network errors only, never on 409
const uint32_t BEEP_MS = 100;

//---- shared between the network task and the light/button loop ----
volatile ServerState serverState = S_IDLE;
volatile int trialIndex = -1;         //-1 = no trial running
volatile bool online = false;         //wifi connected and the server answers
volatile Overlay pendingOverlay = O_NONE; //set by the network task, shown by the loop
volatile bool pressInFlight = false;  //one press at a time

struct Press {
  const char* decision; //trust, unsure or dont_trust (the backend's values)
  int trial;            //the trial the participant saw when pressing
};
#if !defined(ESP8266)
QueueHandle_t pressQueue;             //esp32: presses go to the network task
#endif

//---- buttons ----
struct Button {
  int pin;
  const char* decision;
  bool lastReading;
  bool stable;
  uint32_t changedAt;
};
Button buttons[] = {
  {PIN_TRUST, "trust", true, true, 0},
  {PIN_UNSURE, "unsure", true, true, 0},
  {PIN_DONT_TRUST, "dont_trust", true, true, 0},
};

//---- light ----
ServerState shownState = S_IDLE;
uint32_t stateSince = 0;
Overlay overlay = O_NONE;
uint32_t overlaySince = 0;
uint32_t beepUntil = 0;

void writeLed(Light l) {
  uint8_t v[3] = {
    (uint8_t)(l.colour.r * l.level),
    (uint8_t)(l.colour.g * l.level),
    (uint8_t)(l.colour.b * l.level),
  };
  const int pins[3] = {PIN_RED, PIN_GREEN, PIN_BLUE};
  for (int i = 0; i < 3; i++) analogWrite(pins[i], COMMON_ANODE ? 255 - v[i] : v[i]);
}

void startOverlay(Overlay o) {
  overlay = o;
  overlaySince = millis();
  if (o == O_RECORDED && BUZZER_ON) {
    digitalWrite(PIN_BUZZER, HIGH);
    beepUntil = millis() + BEEP_MS;
  }
}

void updateLight() {
  uint32_t now = millis();
  if (pendingOverlay != O_NONE) { //a press result arrived from the network task
    startOverlay(pendingOverlay);
    pendingOverlay = O_NONE;
  }
  if (beepUntil && now >= beepUntil) {
    digitalWrite(PIN_BUZZER, LOW);
    beepUntil = 0;
  }
  ServerState s = serverState;
  if (s != shownState) { //restart the pattern when the state changes
    shownState = s;
    stateSince = now;
    Serial.printf("state: %d (trial %d)\n", (int)s, (int)trialIndex);
  }
  if (overlay != O_NONE && now - overlaySince < overlayLength(overlay)) {
    writeLed(overlayLight(overlay, now - overlaySince));
  } else if (!DEMO_MODE && !online) {
    overlay = O_NONE;
    writeLed(connectingLight(now));
  } else {
    overlay = O_NONE;
    writeLed(stateLight(shownState, now - stateSince));
  }
}

//returns the decision of a button that was just pressed, or null
const char* readButtons() {
  uint32_t now = millis();
  const char* pressed = nullptr;
  for (Button& b : buttons) {
    bool reading = digitalRead(b.pin); //high = released (pull-up), low = pressed
    if (reading != b.lastReading) {
      b.lastReading = reading;
      b.changedAt = now;
    }
    if (now - b.changedAt >= DEBOUNCE_MS && reading != b.stable) {
      b.stable = reading;
      if (!reading && !pressed) pressed = b.decision; //only the press, not the release
    }
  }
  return pressed;
}

//---- network ----
bool beginRequest(HTTPClient& http, WiFiClient& plain, WiFiClientSecure& secure, const String& url) {
  http.setTimeout(HTTP_TIMEOUT_MS);
#if !defined(ESP8266)
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
#endif
  http.setReuse(true);
  if (url.startsWith("https")) {
    secure.setInsecure(); //no certificate check: fine for a lab device talking to our own backend
    return http.begin(secure, url);
  }
  return http.begin(plain, url);
}

//reads "key":"value" from a small json answer, empty if missing
String jsonString(const String& body, const char* key) {
  String pattern = String("\"") + key + "\":\"";
  int start = body.indexOf(pattern);
  if (start < 0) return "";
  start += pattern.length();
  int end = body.indexOf('"', start);
  return end < 0 ? "" : body.substring(start, end);
}

//reads "key":123 from a small json answer, -1 if missing or null
int jsonInt(const String& body, const char* key) {
  String pattern = String("\"") + key + "\":";
  int start = body.indexOf(pattern);
  if (start < 0) return -1;
  start += pattern.length();
  if (body.startsWith("null", start)) return -1;
  return body.substring(start).toInt();
}

int pollFailures = 0;

void pollState(WiFiClient& plain, WiFiClientSecure& secure) {
  HTTPClient http;
  String url = String(SERVER_URL) + "/device/state?deviceId=" + DEVICE_ID;
  int code = beginRequest(http, plain, secure, url) ? http.GET() : -1;
  if (code == 200) {
    String body = http.getString();
    serverState = parseState(jsonString(body, "state").c_str());
    trialIndex = jsonInt(body, "trialIndex");
    pollFailures = 0;
    online = true;
  } else if (++pollFailures >= FAILS_BEFORE_OFFLINE) {
    online = false;
  }
  http.end();
}

//sends one press; 201 = recorded, 409 = cannot be used (never retried), anything else is retried
void sendPress(const Press& p, WiFiClient& plain, WiFiClientSecure& secure) {
  if (p.trial < 0) { //no trial running: nothing to send
    pendingOverlay = O_REJECTED;
    return;
  }
  String body = String("{\"deviceId\":\"") + DEVICE_ID + "\",\"trialIndex\":" + p.trial +
                ",\"decision\":\"" + p.decision + "\"}";
  for (int attempt = 0; attempt <= PRESS_RETRIES; attempt++) {
    HTTPClient http;
    String url = String(SERVER_URL) + "/device/decision";
    int code = -1;
    if (beginRequest(http, plain, secure, url)) {
      http.addHeader("Content-Type", "application/json");
      code = http.POST(body);
    }
    String answer = code > 0 ? http.getString() : "";
    http.end();
    Serial.printf("press %s trial %d -> %d %s\n", p.decision, p.trial, code, answer.c_str());
    if (code == 201) {
      serverState = S_IDLE; //the server turns the light off after a decision; do it now instead of on the next poll
      pendingOverlay = O_RECORDED;
      return;
    }
    if (code == 409 && attempt > 0 && answer.indexOf("already recorded") >= 0) {
      //an earlier attempt reached the server but its answer was lost: the press was saved
      serverState = S_IDLE;
      pendingOverlay = O_RECORDED;
      return;
    }
    if (code >= 400 && code < 500) { //409 (no trial, result not ready, already answered) or 400: never retry
      pendingOverlay = O_REJECTED;
      return;
    }
    delay(200); //network error or server error: try again
  }
  pendingOverlay = O_REJECTED;
}

void connectWifi() {
  Serial.printf("connecting to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 10000) delay(250);
  if (WiFi.status() == WL_CONNECTED) Serial.printf("wifi ok, ip %s\n", WiFi.localIP().toString().c_str());
}

#if defined(ESP8266)
//esp8266 has no separate task: the loop polls between light updates (requests on the hotspot take a few tens of ms)
WiFiClient plainClient;
WiFiClientSecure secureClient;
uint32_t lastPollAt = 0;

void networkStep() {
  if (WiFi.status() != WL_CONNECTED) {
    online = false;
    connectWifi();
    return;
  }
  if (millis() - lastPollAt >= POLL_MS) {
    lastPollAt = millis();
    pollState(plainClient, secureClient);
  }
}
#else
//runs separately from the loop, so slow network calls never freeze the light or the buttons
void networkTask(void*) {
  WiFiClient plain;
  WiFiClientSecure secure;
  uint32_t lastPoll = 0;
  for (;;) {
    if (WiFi.status() != WL_CONNECTED) {
      online = false;
      connectWifi();
      continue;
    }
    Press p;
    if (xQueueReceive(pressQueue, &p, 0) == pdTRUE) {
      sendPress(p, plain, secure);
      pressInFlight = false;
      lastPoll = 0; //poll right after a press so the light follows the server quickly
    }
    if (millis() - lastPoll >= POLL_MS) {
      lastPoll = millis();
      pollState(plain, secure);
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}
#endif

//---- demo mode: no wifi, steps through every state so the patterns can be checked ----
const ServerState DEMO_STATES[] = {S_IDLE, S_READY, S_PROCESSING, S_STRONG, S_WEAK, S_NONE};
const uint32_t DEMO_STEP_MS = 4000;

void demoStep() {
  int i = (millis() / DEMO_STEP_MS) % 6;
  serverState = DEMO_STATES[i];
  trialIndex = DEMO_STATES[i] == S_IDLE ? -1 : 1;
}

void demoPress(const char* decision) {
  //same rules as the server: no trial or still processing = not recorded
  bool ok = trialIndex >= 0 && serverState != S_PROCESSING;
  Serial.printf("demo press %s -> %s\n", decision, ok ? "recorded" : "not recorded");
  startOverlay(ok ? O_RECORDED : O_REJECTED);
}

//---- arduino ----
void setup() {
  Serial.begin(115200);
#if defined(ESP8266)
  analogWriteRange(255);              //same 0-255 range as the esp32
#endif
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  for (Button& b : buttons) pinMode(b.pin, INPUT_PULLUP);
  writeLed({WHITE, 0.0f});

  if (DEMO_MODE) {
    Serial.println("demo mode: no wifi, cycling through the light states");
    return;
  }
#if defined(ESP8266)
  connectWifi();
#else
  pressQueue = xQueueCreate(4, sizeof(Press));
  xTaskCreate(networkTask, "network", 12288, nullptr, 1, nullptr); //12 kB: enough for https too
#endif
}

void loop() {
  if (DEMO_MODE) demoStep();
  const char* decision = readButtons();
  if (decision) {
    if (DEMO_MODE) {
      demoPress(decision);
    } else if (!online) { //no wifi or no server: the press cannot be recorded
      startOverlay(O_REJECTED);
    } else if (!pressInFlight) { //ignore extra presses while one is being sent
      pressInFlight = true;
      Press p = {decision, trialIndex};
#if defined(ESP8266)
      sendPress(p, plainClient, secureClient); //sent straight away; the light catches up afterwards
      pressInFlight = false;
      lastPollAt = 0;                        //poll right after a press so the light follows the server quickly
#else
      xQueueSend(pressQueue, &p, 0);
#endif
    }
  }
#if defined(ESP8266)
  if (!DEMO_MODE) networkStep();
#endif
  updateLight();
  delay(5);
}
