//light patterns for the facttrace device, exactly as in docs/device-signal-spec.md
//kept free of arduino code so the timing can be tested on a computer (firmware/test/test_signals.cpp)

#pragma once
#include <stdint.h>
#include <math.h>
#include <string.h>

//colours: white for system states, blue for match results; never green or red (they read as true and false)
struct Rgb {
  uint8_t r, g, b;
};
const Rgb WHITE = {255, 255, 255};
const Rgb BLUE = {0, 60, 255};

const float DIM = 0.3f; //brightness of "ready", "not recorded" and "connecting"

//the six states the backend sends on GET /api/device/state
enum ServerState { S_IDLE, S_READY, S_PROCESSING, S_STRONG, S_WEAK, S_NONE, S_UNKNOWN };

//short patterns shown on top of the server state after a button press
enum Overlay { O_NONE, O_RECORDED, O_REJECTED };

//timings in ms (spec: at most 3 flashes in any second)
const uint32_t BREATHE_PERIOD = 1500;   //processing: smooth fade, no hard flashes
const uint32_t BLINK_PERIOD = 1000;     //weak match: on 500, off 500
const uint32_t DOUBLE_PERIOD = 1500;    //no match: on 150, off 150, on 150, off 1050
const uint32_t RECORDED_MS = 300;       //press recorded: one flash
const uint32_t REJECT_ON = 100;         //press not recorded: on 100, off 233, three times
const uint32_t REJECT_STEP = 333;
const uint32_t REJECT_MS = 3 * REJECT_STEP;
const uint32_t CONNECT_PERIOD = 2000;   //connecting: on 200 every 2 s
const uint32_t CONNECT_ON = 200;

struct Light {
  Rgb colour;
  float level; //0 = off, 1 = full
};

inline ServerState parseState(const char* s) {
  if (!s) return S_UNKNOWN;
  if (!strcmp(s, "idle")) return S_IDLE;
  if (!strcmp(s, "ready")) return S_READY;
  if (!strcmp(s, "processing")) return S_PROCESSING;
  if (!strcmp(s, "strong_match")) return S_STRONG;
  if (!strcmp(s, "weak_match")) return S_WEAK;
  if (!strcmp(s, "no_match")) return S_NONE;
  return S_UNKNOWN;
}

//the light for a server state, t = ms since the state started
inline Light stateLight(ServerState s, uint32_t t) {
  switch (s) {
    case S_READY:
      return {WHITE, DIM};
    case S_PROCESSING: {
      float phase = (float)(t % BREATHE_PERIOD) / BREATHE_PERIOD;
      return {WHITE, 0.05f + 0.95f * (1.0f - cosf(2.0f * (float)M_PI * phase)) / 2.0f};
    }
    case S_STRONG:
      return {BLUE, 1.0f};
    case S_WEAK:
      return {BLUE, (t % BLINK_PERIOD) < 500 ? 1.0f : 0.0f};
    case S_NONE: {
      uint32_t p = t % DOUBLE_PERIOD;
      bool on = p < 150 || (p >= 300 && p < 450);
      return {BLUE, on ? 1.0f : 0.0f};
    }
    default: //idle and unknown: off
      return {WHITE, 0.0f};
  }
}

//how long an overlay lasts
inline uint32_t overlayLength(Overlay o) {
  return o == O_RECORDED ? RECORDED_MS : o == O_REJECTED ? REJECT_MS : 0;
}

//the light for an overlay, t = ms since it started (only called while t < overlayLength)
inline Light overlayLight(Overlay o, uint32_t t) {
  if (o == O_RECORDED) return {WHITE, 1.0f};
  if (o == O_REJECTED) return {WHITE, (t % REJECT_STEP) < REJECT_ON ? DIM : 0.0f};
  return {WHITE, 0.0f};
}

//the light while there is no wifi or no answer from the server
inline Light connectingLight(uint32_t t) {
  return {WHITE, (t % CONNECT_PERIOD) < CONNECT_ON ? DIM : 0.0f};
}
