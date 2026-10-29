import React, { useState } from 'react';
import { Cpu, Radio, Key, Check, Copy, AlertTriangle, Zap, Terminal, Shield, ArrowRight } from 'lucide-react';
import { api } from '../services/api.ts';

interface Esp32HardwareLabProps {
  onRefreshLockState: () => void;
  onRefreshLogs: () => void;
  onRefreshAlerts: () => void;
}

export const Esp32HardwareLab: React.FC<Esp32HardwareLabProps> = ({
  onRefreshLockState,
  onRefreshLogs,
  onRefreshAlerts,
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'firmware'>('simulator');
  const [hardwarePin, setHardwarePin] = useState('');
  const [hwStatus, setHwStatus] = useState<string | null>(null);
  const [hwLoading, setHwLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // PIR Trigger
  const handlePirTrigger = async () => {
    try {
      setHwLoading(true);
      setHwStatus('PIR Sensor GPIO27 Tripped! Sending HTTPS POST /api/intrusion/alert...');
      await api.reportIntrusion('PIR_MOTION_GPIO27');
      onRefreshAlerts();
      setHwStatus('✅ Alert logged in IntrusionAlert collection. Nodemailer email dispatched via Gmail SMTP.');
    } catch (err: any) {
      setHwStatus(`❌ Error: ${err.message}`);
    } finally {
      setHwLoading(false);
    }
  };

  // Hardware Keypad submit to /api/lock/verify-pin
  const handleKeypadSubmit = async (pinToVerify = hardwarePin) => {
    if (!pinToVerify) return;
    try {
      setHwLoading(true);
      setHwStatus(`Transmitting PIN [${pinToVerify}] via ESP32 HTTPS Client to /api/lock/verify-pin...`);
      const result = await api.esp32VerifyPin(pinToVerify);
      if (result.authenticated) {
        setHwStatus(`✅ Authenticated (User: ${result.user}). Solenoid relay driven HIGH for ${result.holdSeconds}s!`);
        onRefreshLockState();
        onRefreshLogs();
        setHardwarePin('');
      } else {
        setHwStatus('❌ Verification Failed (HTTP 401). Buzzer GPIO25 beeped 3x error tone.');
        onRefreshLogs();
        setHardwarePin('');
      }
    } catch (err: any) {
      setHwStatus(`❌ Communication error: ${err.message}`);
    } finally {
      setHwLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(esp32FirmwareCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const esp32FirmwareCode = `/*
 * ================================================================
 * SecureKey IoT Smart Lock & Intrusion Alarm System
 * ESP32 Production Microcontroller Firmware (C++ / Arduino IDE)
 * ================================================================
 * Target: ESP32-WROOM-32 / ESP32-S3
 * Libraries: WiFi.h, HTTPClient.h, WiFiClientSecure.h, ArduinoJson.h
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// --- Network & Server Configuration ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "https://your-securekey-api.applet.run"; // Or Cloud Run URL
const char* DEVICE_ID     = "ESP32_SECUREKEY_01";

// --- GPIO Pin Allocations ---
#define PIN_PIR_SENSOR   27  // PIR Motion Sensor (Active HIGH Interrupt)
#define PIN_RELAY_LOCK   26  // 5V Solenoid Deadbolt Relay (Active LOW/HIGH)
#define PIN_BUZZER       25  // Piezo Buzzer for Audio Feedback
#define PIN_STATUS_LED    2  // Built-in Blue Status LED

// Lock & Relock Timers
const unsigned long AUTO_RELOCK_MS = 5000;
unsigned long lockUnlockedTimestamp = 0;
bool isDoorUnlocked = false;
volatile bool pirMotionDetected = false;

// Interrupt Service Routine for PIR Motion
void IRAM_ATTR isrPirMotion() {
  pirMotionDetected = true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n[SecureKey] Initializing Hardware Subsystems...");

  pinMode(PIN_PIR_SENSOR, INPUT_PULLDOWN);
  pinMode(PIN_RELAY_LOCK, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // Initial State: Solenoid locked
  digitalWrite(PIN_RELAY_LOCK, LOW);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Connect to WiFi
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
  }
  digitalWrite(PIN_STATUS_LED, HIGH);
  Serial.printf("\\n[WiFi] Connected! IP: %s\\n", WiFi.localIP().toString().c_str());

  // Attach PIR Motion Interrupt
  attachInterrupt(digitalPinToInterrupt(PIN_PIR_SENSOR), isrPirMotion, RISING);
  Serial.println("[Security] PIR Sensor GPIO27 Armed & Monitoring.");
}

void loop() {
  // 1. Handle PIR Motion Sensor Interrupt
  if (pirMotionDetected) {
    pirMotionDetected = false;
    if (!isDoorUnlocked) {
      Serial.println("[ALARM] Motion detected while system LOCKED!");
      tone(PIN_BUZZER, 2000, 300);
      dispatchIntrusionAlert("PIR_MOTION_GPIO27");
    }
  }

  // 2. Auto-Relock Solenoid Timer Check (5 seconds hold)
  if (isDoorUnlocked && (millis() - lockUnlockedTimestamp >= AUTO_RELOCK_MS)) {
    engageLock();
  }

  delay(50);
}

// Unlock solenoid relay
void unlockDoor(int holdSeconds) {
  isDoorUnlocked = true;
  lockUnlockedTimestamp = millis();
  digitalWrite(PIN_RELAY_LOCK, HIGH); // Engage solenoid
  tone(PIN_BUZZER, 1200, 150);
  Serial.printf("[Lock] Door UNLOCKED. Auto-relock armed for %d seconds.\\n", holdSeconds);
  notifyServerStatus("UNLOCKED");
}

// Lock solenoid relay
void engageLock() {
  isDoorUnlocked = false;
  digitalWrite(PIN_RELAY_LOCK, LOW); // De-energize solenoid
  tone(PIN_BUZZER, 800, 200);
  Serial.println("[Lock] Door AUTO-RELOCKED.");
  notifyServerStatus("AUTO_RELOCKED");
}

// Verify PIN with REST Backend: POST /api/lock/verify-pin
bool verifyPinWithBackend(const char* enteredPin) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure(); // For dev HTTPS or install root CA
  HTTPClient https;

  String endpoint = String(SERVER_URL) + "/api/lock/verify-pin";
  https.begin(client, endpoint);
  https.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["pin"] = enteredPin;
  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = https.POST(requestBody);
  if (httpCode == 200) {
    String payload = https.getString();
    StaticJsonDocument<256> resp;
    deserializeJson(resp, payload);
    int hold = resp["holdSeconds"] | 5;
    unlockDoor(hold);
    https.end();
    return true;
  } else {
    Serial.printf("[HTTP] Access Denied. Code: %d\\n", httpCode);
    tone(PIN_BUZZER, 400, 400);
    https.end();
    return false;
  }
}

// Dispatch Intrusion: POST /api/intrusion/alert
void dispatchIntrusionAlert(const char* sensorName) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String endpoint = String(SERVER_URL) + "/api/intrusion/alert";
  https.begin(client, endpoint);
  https.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["sensor"] = sensorName;
  String body;
  serializeJson(doc, body);

  int httpCode = https.POST(body);
  Serial.printf("[Intrusion] Alert dispatched. Status code: %d\\n", httpCode);
  https.end();
}

// Update lock status: POST /api/lock/status
void notifyServerStatus(const char* state) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String endpoint = String(SERVER_URL) + "/api/lock/status";
  https.begin(client, endpoint);
  https.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["state"] = state;
  String body;
  serializeJson(doc, body);

  https.POST(body);
  https.end();
}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between p-1.5 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'simulator'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-4 w-4" />
          Interactive ESP32 Testbench
        </button>
        <button
          onClick={() => setActiveTab('firmware')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'firmware'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="h-4 w-4" />
          ESP32 C++ Firmware (.ino)
        </button>
      </div>

      {activeTab === 'simulator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hardware Board Schematic Card */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-white tracking-tight">
                    ESP32-WROOM-32 IoT Subsystem
                  </h3>
                  <span className="font-mono text-[11px] text-slate-400">
                    Dual-Core Xtensa &bull; 2.4 GHz WiFi &bull; HTTPS REST Client
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-900">
                STATION_ONLINE
              </span>
            </div>

            {/* Microcontroller Schematic Visual */}
            <div className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
              <div className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" /> GPIO Pin Assignment & Active Triggers
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* GPIO 27 - PIR */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-200">GPIO 27</div>
                      <div className="text-[11px] text-slate-400">PIR Motion Interrupt (Rising)</div>
                    </div>
                  </div>
                  <button
                    onClick={handlePirTrigger}
                    disabled={hwLoading}
                    className="px-2.5 py-1 text-[11px] font-medium rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 active:scale-95 transition-all cursor-pointer"
                  >
                    Trip PIR
                  </button>
                </div>

                {/* GPIO 26 - Solenoid */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-200">GPIO 26</div>
                      <div className="text-[11px] text-slate-400">Solenoid Relay (5s Hold)</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400">AUTO_ARMED</span>
                </div>

                {/* GPIO 25 - Buzzer */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-200">GPIO 25</div>
                      <div className="text-[11px] text-slate-400">Piezo Alarm / Tone Feedback</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-amber-400">ACTIVE</span>
                </div>

                {/* GPIO 2 - LED */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-200">GPIO 2</div>
                      <div className="text-[11px] text-slate-400">Status Indicator & WiFi Sync</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-cyan-400">LINKED</span>
                </div>
              </div>
            </div>

            {/* Status Console Output */}
            <div className="mt-auto">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-mono flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-cyan-400" /> Hardware UART Serial Console (115200 baud)
                </span>
              </div>
              <div className="h-24 p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-y-auto border border-slate-800/80">
                <div className="text-slate-500">[ESP32 Boot] SecureKey Firmware v2.4 initialized.</div>
                <div className="text-cyan-400">[Network] WiFi connected. Device IP: 192.168.1.50</div>
                <div className="text-slate-400">[Security] Solenoid GPIO26 locked. PIR GPIO27 interrupt listening.</div>
                {hwStatus && (
                  <div className="text-amber-300 mt-1">&gt; {hwStatus}</div>
                )}
              </div>
            </div>
          </div>

          {/* ESP32 Physical Keypad Hardware Simulator */}
          <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-400" />
                <h3 className="font-display text-sm font-bold text-white tracking-tight">
                  ESP32 Physical Door Keypad
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                POST /api/lock/verify-pin
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Simulates a 4x4 matrix membrane keypad directly wired to the ESP32. Sends hardware authentication request to Node.js backend.
            </p>

            {/* Screen */}
            <div className="my-4 h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-lg tracking-widest text-amber-400">
              <span>{hardwarePin ? hardwarePin.replace(/./g, '●') : '_ _ _ _'}</span>
              <span className="text-xs font-mono text-slate-600">4-6 digits</span>
            </div>

            {/* Quick keypad matrix */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button
                  key={n}
                  onClick={() => setHardwarePin((p) => (p.length < 6 ? p + n : p))}
                  className="h-11 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 font-mono text-sm font-bold text-white transition-all border border-slate-700"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setHardwarePin('')}
                className="h-11 rounded-lg bg-slate-800/60 hover:bg-slate-700 active:scale-95 font-mono text-xs font-medium text-slate-400 transition-all border border-slate-700/60"
              >
                CLR
              </button>
              <button
                onClick={() => setHardwarePin((p) => (p.length < 6 ? p + '0' : p))}
                className="h-11 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 font-mono text-sm font-bold text-white transition-all border border-slate-700"
              >
                0
              </button>
              <button
                onClick={() => handleKeypadSubmit()}
                disabled={hwLoading || hardwarePin.length < 4}
                className="h-11 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 font-mono text-xs font-bold text-slate-950 transition-all shadow-md shadow-amber-950/40 disabled:opacity-40"
              >
                ENTER
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>Test valid PIN:</span>
              <button
                onClick={() => {
                  setHardwarePin('1234');
                  handleKeypadSubmit('1234');
                }}
                className="text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
              >
                Send PIN: 1234
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ESP32 Firmware Source Code Tab */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Terminal className="h-5 w-5 text-cyan-400" />
                Arduino / ESP-IDF C++ Firmware Source Code
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deployable `SecureKey_ESP32.ino` sketch with WiFi, HTTPS client, PIR ISR, and solenoid relay control
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Code Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Firmware Code
                </>
              )}
            </button>
          </div>

          <pre className="mt-4 p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] border border-slate-800 leading-relaxed">
            <code>{esp32FirmwareCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
