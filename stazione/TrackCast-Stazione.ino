/*
  TrackCast Stazione - stazione meteo da pista per kart (ESP32)
  ------------------------------------------------------------------
  Misura e pubblica ogni secondo, su http://<indirizzo>/data, un JSON letto
  dall'app TrackCast-Kart.html (pulsante "Collega" nella scheda "La tua stazione").

  COMPONENTI (circa 60-90 euro in tutto)
    - ESP32 DevKit (qualsiasi modello con Wi-Fi)
    - BME280 (I2C, indirizzo 0x76): aria, umidita', pressione
    - MLX90614 (I2C, indirizzo 0x5A): temperatura dell'ASFALTO a infrarossi,
      puntato sulla pista da 30-50 cm, al riparo dalla pioggia diretta
    - Pluviometro a vaschetta basculante con contatto reed (0,2794 mm per scatto)
    - Anemometro a coppe con contatto reed (2,4 km/h per impulso al secondo)
    - Powerbank USB o batteria con regolatore 5 V

  COLLEGAMENTI
    BME280 e MLX90614:  SDA -> GPIO 21, SCL -> GPIO 22, VCC -> 3V3, GND -> GND
    Pluviometro:        un capo -> GPIO 27, l'altro -> GND
    Anemometro:         un capo -> GPIO 26, l'altro -> GND

  LIBRERIE (Arduino IDE > Gestione librerie)
    - Adafruit BME280 Library
    - Adafruit MLX90614 Library
    (WiFi, WebServer ed ESPmDNS sono gia' incluse nel pacchetto ESP32)

  RETE
    La stazione si collega all'hotspot del telefono (imposta nome e password qui sotto).
    L'indirizzo da scrivere nell'app compare nel Monitor seriale (115200 baud),
    per esempio http://192.168.43.50. Se l'hotspot non si trova entro 20 secondi,
    la stazione crea una sua rete "TrackCast-Stazione" (password trackcast)
    raggiungibile su http://192.168.4.1
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <Adafruit_MLX90614.h>

// ---------- da personalizzare ----------
const char* HOTSPOT_NAME = "NomeHotspotTelefono";
const char* HOTSPOT_PASS = "PasswordHotspot";
const char* STATION_ID   = "TC-01";
// --- Cloud del team (piano Pro): lascia vuoto per usare solo il collegamento diretto ---
const char* SUPABASE_URL = "";   // es. "https://abcd.supabase.co"
const char* SUPABASE_KEY = "";   // chiave "anon public" del progetto
const char* STATION_KEY  = "";   // chiave stazione creata nel sito (Strumenti Pro › Assetto › Stazione nel cloud)
// correzione dell'emissivita' / offset del sensore IR, da tarare con un pirometro di riferimento
const float ASPH_OFFSET  = 0.0;
// ---------------------------------------

const int PIN_RAIN = 27;
const int PIN_WIND = 26;
const float MM_PER_TIP = 0.2794;
const float KMH_PER_HZ = 2.4;

Adafruit_BME280 bme;
Adafruit_MLX90614 mlx;
WebServer server(80);
bool hasBME = false, hasMLX = false;

// pluviometro: orari degli scatti negli ultimi 60 minuti
volatile unsigned long rainTips[400];
volatile int rainHead = 0;
volatile unsigned long lastRainTip = 0;
// anemometro
volatile unsigned long windPulses = 0;
volatile unsigned long lastWindPulse = 0;
float windKmh = 0, gustKmh = 0;
unsigned long gustWindowStart = 0;

float asph = NAN, ta = NAN, rh = NAN, ps = NAN;

void IRAM_ATTR onRain() {
  unsigned long now = millis();
  if (now - lastRainTip < 300) return;           // anti-rimbalzo
  lastRainTip = now;
  rainTips[rainHead] = now;
  rainHead = (rainHead + 1) % 400;
}
void IRAM_ATTR onWind() {
  unsigned long now = millis();
  if (now - lastWindPulse < 5) return;
  lastWindPulse = now;
  windPulses++;
}

float rainMmInLast(unsigned long ms) {
  unsigned long now = millis();
  int n = 0;
  for (int i = 0; i < 400; i++) {
    unsigned long t = rainTips[i];
    if (t != 0 && now - t <= ms) n++;
  }
  return n * MM_PER_TIP;
}

String num(float v, int d) { return isnan(v) ? String("null") : String(v, d); }

void sendCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Private-Network", "true"); // Chrome: accesso alla rete locale
  server.sendHeader("Cache-Control", "no-store");
}

String dataJson() {
  float rain10 = rainMmInLast(10UL * 60 * 1000);      // mm negli ultimi 10 minuti
  String j = "{";
  j += "\"id\":\"" + String(STATION_ID) + "\",";
  j += "\"uptime\":" + String(millis() / 1000) + ",";
  j += "\"asph\":" + num(asph, 1) + ",";
  j += "\"ta\":" + num(ta, 1) + ",";
  j += "\"rh\":" + num(rh, 0) + ",";
  j += "\"ps\":" + num(ps, 1) + ",";
  j += "\"rain_mmh\":" + String(rain10 * 6.0, 1) + ",";
  j += "\"rain_mm_1h\":" + String(rainMmInLast(60UL * 60 * 1000), 1) + ",";
  j += "\"wind_kmh\":" + String(windKmh, 1) + ",";
  j += "\"gust_kmh\":" + String(gustKmh, 1);
  j += "}";
  return j;
}

void handleData() {
  sendCors();
  server.send(200, "application/json", dataJson());
}

// Invia i dati al cloud del team ogni 10 s (se configurato e se c'è internet dall'hotspot)
unsigned long lastCloud = 0;
void pushCloud() {
  if (!strlen(SUPABASE_URL) || !strlen(STATION_KEY) || WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, String(SUPABASE_URL) + "/rest/v1/rpc/station_push")) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
  http.setTimeout(4000);
  http.POST("{\"k\":\"" + String(STATION_KEY) + "\",\"d\":" + dataJson() + "}");
  http.end();
}

void handleOptions() { sendCors(); server.send(204); }

void handleRoot() {
  sendCors();
  server.send(200, "text/html",
    "<meta name=viewport content='width=device-width'><h2>TrackCast Stazione " + String(STATION_ID) +
    "</h2><p>Dati: <a href='/data'>/data</a></p><p>Asfalto " + num(asph, 1) + " &deg;C &middot; Aria " + num(ta, 1) +
    " &deg;C &middot; " + num(rh, 0) + "% &middot; " + num(ps, 1) + " hPa</p>");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  hasBME = bme.begin(0x76) || bme.begin(0x77);
  hasMLX = mlx.begin();
  Serial.printf("BME280: %s, MLX90614: %s\n", hasBME ? "ok" : "NON TROVATO", hasMLX ? "ok" : "NON TROVATO");

  pinMode(PIN_RAIN, INPUT_PULLUP);
  pinMode(PIN_WIND, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_RAIN), onRain, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_WIND), onWind, FALLING);

  WiFi.mode(WIFI_STA);
  WiFi.begin(HOTSPOT_NAME, HOTSPOT_PASS);
  Serial.print("Collegamento all'hotspot");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) { delay(500); Serial.print("."); }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nCollegata. Nell'app scrivi: http://%s\n", WiFi.localIP().toString().c_str());
  } else {
    WiFi.mode(WIFI_AP);
    WiFi.softAP("TrackCast-Stazione", "trackcast");
    Serial.println("\nHotspot non trovato: rete propria \"TrackCast-Stazione\" (password trackcast). Nell'app scrivi: http://192.168.4.1");
  }
  MDNS.begin("trackcast");   // su alcuni computer funziona anche http://trackcast.local

  server.on("/", HTTP_GET, handleRoot);
  server.on("/data", HTTP_GET, handleData);
  server.on("/data", HTTP_OPTIONS, handleOptions);
  server.onNotFound([]() { if (server.method() == HTTP_OPTIONS) handleOptions(); else { sendCors(); server.send(404, "text/plain", "TrackCast"); } });
  server.begin();
  gustWindowStart = millis();
}

unsigned long lastRead = 0, lastWind = 0;

void loop() {
  server.handleClient();
  unsigned long now = millis();
  if (now - lastCloud >= 10000) { lastCloud = now; pushCloud(); }

  if (now - lastRead >= 1000) {          // sensori: una lettura al secondo, con media mobile
    lastRead = now;
    if (hasBME) {
      float t = bme.readTemperature(), h = bme.readHumidity(), p = bme.readPressure() / 100.0;
      ta = isnan(ta) ? t : ta * 0.8 + t * 0.2;
      rh = isnan(rh) ? h : rh * 0.8 + h * 0.2;
      ps = isnan(ps) ? p : ps * 0.8 + p * 0.2;
    }
    if (hasMLX) {
      float a = mlx.readObjectTempC() + ASPH_OFFSET;
      if (a > -30 && a < 90) asph = isnan(asph) ? a : asph * 0.7 + a * 0.3;
    }
  }

  if (now - lastWind >= 3000) {          // vento medio su 3 s, raffica = massimo su 10 minuti
    noInterrupts(); unsigned long p = windPulses; windPulses = 0; interrupts();
    windKmh = (p / ((now - lastWind) / 1000.0)) * KMH_PER_HZ;
    lastWind = now;
    if (now - gustWindowStart > 600000UL) { gustKmh = 0; gustWindowStart = now; }
    if (windKmh > gustKmh) gustKmh = windKmh;
  }
}
