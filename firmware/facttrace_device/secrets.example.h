//copy this file to secrets.h (same folder) and fill in your own values
//secrets.h is gitignored because the repo is public: never commit a real password

#pragma once

#define WIFI_SSID "your-hotspot-name"
#define WIFI_PASSWORD "your-hotspot-password"

//the backend's /api address; use the laptop's ip on the same hotspot (find it with ipconfig)
//do not use an ngrok address here: the device polls about 200 times a minute and ngrok's free plan allows 20,000 requests a month
#define SERVER_URL "http://192.168.137.1:3000/api"
