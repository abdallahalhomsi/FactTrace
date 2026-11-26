//checks the light patterns in signals.h against docs/device-signal-spec.md, on a computer (no esp32 needed)
//run from the repo root: g++ -std=c++17 -o /tmp/test_signals firmware/test/test_signals.cpp && /tmp/test_signals

#include <cstdio>
#include "../facttrace_device/signals.h"

int failed = 0;
void check(bool ok, const char* name) {
  printf("%s  %s\n", ok ? "PASS" : "FAIL", name);
  if (!ok) failed++;
}

bool isOn(Light l) { return l.level > 0.5f * DIM; }
bool same(Rgb a, Rgb b) { return a.r == b.r && a.g == b.g && a.b == b.b; }

//largest number of flashes (off to on) in any 1 second window, sampled every ms over 10 s
template <typename F>
int maxFlashesPerSecond(F lightAt) {
  bool on[10000];
  for (int t = 0; t < 10000; t++) on[t] = isOn(lightAt(t));
  int worst = 0;
  for (int start = 0; start + 1000 <= 10000; start++) {
    int flashes = 0;
    for (int t = start + 1; t < start + 1000; t++) if (on[t] && !on[t - 1]) flashes++;
    if (flashes > worst) worst = flashes;
  }
  return worst;
}

//true if the brightness never jumps by more than `step` between two ms (a smooth fade, not a flash)
template <typename F>
bool smooth(F lightAt, float step) {
  for (int t = 1; t < 10000; t++)
    if (fabsf(lightAt(t).level - lightAt(t - 1).level) > step) return false;
  return true;
}

int main() {
  //no green or red anywhere: the colours must not read as true or false
  check(WHITE.r == WHITE.g && WHITE.g == WHITE.b, "white is neutral");
  check(BLUE.b > BLUE.g && BLUE.b > BLUE.r && BLUE.r == 0, "match colour is blue, not green or red");

  //state names from the backend
  check(parseState("idle") == S_IDLE && parseState("ready") == S_READY && parseState("processing") == S_PROCESSING &&
        parseState("strong_match") == S_STRONG && parseState("weak_match") == S_WEAK && parseState("no_match") == S_NONE,
        "all six backend states are recognised");
  check(parseState("verified") == S_UNKNOWN && !isOn(stateLight(S_UNKNOWN, 0)), "unknown state keeps the light off");

  //what each state looks like
  check(!isOn(stateLight(S_IDLE, 0)), "idle: off");
  check(same(stateLight(S_READY, 0).colour, WHITE) && stateLight(S_READY, 0).level == DIM && stateLight(S_READY, 777).level == DIM,
        "ready: dim white, steady");
  check(same(stateLight(S_STRONG, 0).colour, BLUE) && stateLight(S_STRONG, 0).level == 1.0f && stateLight(S_STRONG, 1234).level == 1.0f,
        "strong match: blue, steady");
  check(isOn(stateLight(S_WEAK, 0)) && isOn(stateLight(S_WEAK, 499)) && !isOn(stateLight(S_WEAK, 500)) && !isOn(stateLight(S_WEAK, 999)),
        "weak match: blue, on 500 off 500");
  check(isOn(stateLight(S_NONE, 0)) && !isOn(stateLight(S_NONE, 200)) && isOn(stateLight(S_NONE, 350)) && !isOn(stateLight(S_NONE, 600)) &&
        !isOn(stateLight(S_NONE, 1400)) && isOn(stateLight(S_NONE, 1500)),
        "no match: blue double blink every 1.5 s");
  check(same(stateLight(S_PROCESSING, 0).colour, WHITE) && stateLight(S_PROCESSING, 750).level > 0.99f && stateLight(S_PROCESSING, 0).level < 0.1f,
        "processing: white, fades up and down over 1.5 s");

  //the three match results all differ by pattern, not only by colour (they share one colour)
  check(!(isOn(stateLight(S_WEAK, 600)) == isOn(stateLight(S_STRONG, 600))) &&
        !(isOn(stateLight(S_NONE, 200)) == isOn(stateLight(S_STRONG, 200))) &&
        !(isOn(stateLight(S_NONE, 600)) == isOn(stateLight(S_WEAK, 100))),
        "strong, weak and no match are told apart by pattern");

  //feedback after a press
  check(overlayLength(O_RECORDED) == 300 && isOn(overlayLight(O_RECORDED, 0)) && isOn(overlayLight(O_RECORDED, 299)),
        "recorded: one white flash of 300 ms");
  int rejectBlinks = 0;
  for (int t = 1; t < (int)overlayLength(O_REJECTED); t++)
    if (isOn(overlayLight(O_REJECTED, t)) && !isOn(overlayLight(O_REJECTED, t - 1))) rejectBlinks++;
  check(rejectBlinks + 1 == 3 && overlayLength(O_REJECTED) <= 1000, "not recorded: three short blinks within one second");

  //photosensitivity: at most 3 flashes in any one second (WCAG 2.3.1)
  check(maxFlashesPerSecond([](int t) { return stateLight(S_WEAK, t); }) <= 3, "weak match: at most 3 flashes per second");
  check(maxFlashesPerSecond([](int t) { return stateLight(S_NONE, t); }) <= 3, "no match: at most 3 flashes per second");
  check(maxFlashesPerSecond([](int t) { return overlayLight(O_REJECTED, t % REJECT_MS); }) <= 3, "not recorded: at most 3 flashes per second");
  check(maxFlashesPerSecond([](int t) { return connectingLight(t); }) <= 3, "connecting: at most 3 flashes per second");
  check(smooth([](int t) { return stateLight(S_PROCESSING, t); }, 0.01f), "processing fades smoothly (no hard flashes)");

  printf("\n%d failed\n", failed);
  return failed ? 1 : 0;
}
