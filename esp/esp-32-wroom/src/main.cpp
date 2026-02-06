// ============================================================================
// ESP32-S3 Ball Detection and Sorting System
// ============================================================================
// Hardware: ESP32-S3 DevKitM-1 with ILI9341 TFT, XPT2046 Touch, IR Sensor,
//           Stepper Motor, DC Motor (BTS7960), UART connection to camera module
// ============================================================================

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <XPT2046_Touchscreen.h>
#include <AccelStepper.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================================
// CONFIGURATION
// ============================================================================

// Feature Switches - Enable/disable functionality modules
#define ENABLE_TOUCH 1       // Touch screen input
#define ENABLE_UART_RX 1     // UART communication with camera module
#define ENABLE_API 1         // WiFi and REST API integration

// WiFi and API Configuration
const char* WIFI_SSID = "";
const char* WIFI_PASSWORD = "";
const char* API_BASE_URL = "http://145.24.237.126:8000";  // Backend server
const char* CAMERA_IP = "10.139.61.247";  // XIAO ESP32-S3 Sense camera module

// ============================================================================
// STATE VARIABLES
// ============================================================================

// API Session Management
int currentSessionId = -1;      // Current cleaning session ID
int currentCommandId = -1;      // Current command being processed
unsigned long lastCommandPoll = 0;
const unsigned long COMMAND_POLL_INTERVAL = 2000;  // Poll API every 2 seconds

// UI Component Structures
struct Button { int x, y, w, h; const char* label; };
struct Slider { int x, y, w, h; const char* label; };

// UART Communication
#define RX_PIN 16  // Receive ball detection codes from camera module
#define TX_PIN -1  // Not used - receive only

// Ball Detection State
volatile int ballDetected = 0;           // Current ball type from UART (0=none, 1=soccer, 2=volleyball, 3=basketball)
int lastStableBall = 0;                  // Last confirmed stable ball type
int previousStableBall = 0;              // Previous ball for change detection
unsigned long lastBallChangeMs = 0;      // Timestamp of last ball change
const unsigned long BALL_DEBOUNCE_MS = 2000;  // Ball must be stable for 2 seconds

// Stepper Motor Timing
unsigned long lastStepperStartMs = 0;
const unsigned long STEPPER_START_TOUCH_BLOCK_MS = 300;  // Prevent touch input during stepper movement

// ============================================================================
// HARDWARE PIN DEFINITIONS
// ============================================================================

// SPI Bus Pins
static const int PIN_SCK  = 12;
static const int PIN_MISO = 13;
static const int PIN_MOSI = 11;

// ILI9341 TFT Display Pins (320x240)
static const int TFT_CS  = 10;
static const int TFT_DC  = 9;
static const int TFT_RST = 8;

// XPT2046 Touch Controller Pins
static const int TOUCH_CS  = 3;
static const int TOUCH_IRQ = 21;

Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);
XPT2046_Touchscreen ts(TOUCH_CS, TOUCH_IRQ);

// Touch Screen Calibration Values
static const int TS_MINX = 250;
static const int TS_MAXX = 3800;
static const int TS_MINY = 200;
static const int TS_MAXY = 3900;

// IR Proximity Sensor Configuration
static const int IR_PIN = 15;
static const bool IR_ACTIVE_LOW = true;  // false = HIGH when object detected
static const unsigned long IR_VALID_TIME_MS = 100;  // Debounce time for IR detection
bool irDetected = false;             // Current validated IR state
unsigned long irFirstDetectedMs = 0; // Timestamp of first IR detection
bool irRawState = false;             // Raw IR sensor reading

// Stepper Motor Configuration (Ball Position Control)
#define DIR_PIN        5
#define STEP_PIN       4
#define STEPPER_EN_PIN 6

AccelStepper stepper(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);
const long TRAVEL = 9000;              // Maximum travel range in steps
float stepperMaxSpeed = 3000.0f;       // Maximum speed (steps/second)
float stepperAccel    = 1000.0f;       // Acceleration (steps/second²)

// DC Motor Configuration (BTS7960 Driver - Conveyor Belt)
#define RPWM_PIN  1   // Right PWM - Forward
#define LPWM_PIN  2   // Left PWM - Reverse
#define REN_PIN   42  // Right Enable
#define LEN_PIN   35  // Left Enable

const int PWM_FREQ = 20000;  // 20 kHz PWM frequency
const int PWM_RES  = 8;      // 8-bit resolution (0-255)

uint8_t motorPwm = 100;      // Motor speed (PWM duty cycle)

// Stepper Position Presets for Each Ball Type
const long PRESET_VOLLEYBALL = 4500;  // Volleyball drop position
const long PRESET_SOCCER = 5000;      // Soccer ball drop position
const long PRESET_BASKETBALL = 9000;  // Basketball drop position (max travel)

// UI State Variables
Button btnAdjust, btnAnalyse, btnStartStop, btnDebug;  // Button definitions
bool motorRunning = false;        // DC motor running state (controlled by Start/Stop)
bool motorDirection = false;      // Motor direction (unused - always reverse)
int processedBalls = 0;           // Total count of analyzed balls
bool debugMode = false;           // Debug screen visibility toggle
unsigned long ballAnimationMs = 0;  // Animation timing (currently unused)

// Touch Input Debouncing
unsigned long lastTouchMs = 0;
const unsigned long TOUCH_DEBOUNCE_MS = 160;
bool prevTouched = false;

// ============================================================================
// API COMMUNICATION FUNCTIONS
// ============================================================================

#if ENABLE_API

// Poll the server for new commands (START_CLEANING, STOP_CLEANING)
void pollNextCommand() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(API_BASE_URL) + "/api/commands/next";
  http.begin(url);
  int httpCode = http.POST("");  // POST instead of GET
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    // Check if id is null (no commands available)
    if (error || doc["id"].isNull()) {
      // No commands available, this is normal
      http.end();
      return;
    }
    
    currentCommandId = doc["id"];
    String cmdType = doc["type"].as<String>();
    Serial.print("[API] Command received: ");
    Serial.println(cmdType);
    
    bool success = true;
    String errorMsg = "";
    
    if (cmdType == "START_CLEANING") {
      // Get session_id from command response if available
      if (!doc["session_id"].isNull()) {
        currentSessionId = doc["session_id"];
        Serial.print("[API] Using existing session: ");
        Serial.println(currentSessionId);
      } else {
        // Start new session
        Serial.println("[API] Starting new session...");
        HTTPClient httpStart;
        String startUrl = String(API_BASE_URL) + "/api/sessions/start";
        httpStart.begin(startUrl);
        httpStart.addHeader("Content-Type", "application/json");
        int startCode = httpStart.POST("{}");
        Serial.print("[API] Session start response code: ");
        Serial.println(startCode);
        
        if (startCode == 200) {
          String startPayload = httpStart.getString();
          Serial.print("[API] Session start payload: ");
          Serial.println(startPayload);
          StaticJsonDocument<256> startDoc;
          deserializeJson(startDoc, startPayload);
          currentSessionId = startDoc["id"];
          Serial.print("[API] Session started: ");
          Serial.println(currentSessionId);
        } else {
          Serial.println("[API] Session start FAILED");
          success = false;
          errorMsg = "Failed to start session";
        }
        httpStart.end();
      }
    }
    else if (cmdType == "STOP_CLEANING") {
      // Use session_id from command if available
      int sessionToStop = currentSessionId;
      if (!doc["session_id"].isNull()) {
        sessionToStop = doc["session_id"];
      }
      
      if (sessionToStop > 0) {
        HTTPClient httpStop;
        String stopUrl = String(API_BASE_URL) + "/api/sessions/" + String(sessionToStop) + "/stop";
        httpStop.begin(stopUrl);
        httpStop.addHeader("Content-Type", "application/json");
        int stopCode = httpStop.POST("{\"status\":\"FINISHED\"}");
        
        if (stopCode == 200) {
          Serial.println("[API] Session stopped");
          currentSessionId = -1;
        } else {
          Serial.println("[API] Session stop FAILED");
          success = false;
          errorMsg = "Failed to stop session";
        }
        httpStop.end();
      }
    }
    
    // Mark command as success or failed
    HTTPClient httpResult;
    if (success) {
      String successUrl = String(API_BASE_URL) + "/api/commands/" + String(currentCommandId) + "/success";
      httpResult.begin(successUrl);
      httpResult.POST("");
      Serial.println("[API] Command marked as SUCCESS");
    } else {
      String failedUrl = String(API_BASE_URL) + "/api/commands/" + String(currentCommandId) + "/failed";
      httpResult.begin(failedUrl);
      httpResult.addHeader("Content-Type", "application/json");
      String failJson = "{\"error_message\":\"" + errorMsg + "\"}";
      httpResult.POST(failJson);
      Serial.print("[API] Command marked as FAILED: ");
      Serial.println(errorMsg);
    }
    httpResult.end();
    currentCommandId = -1;
  }
  http.end();
}

// Send ball count update to server for current session
void updateSessionItem(int ballTypeId, int count) {
  Serial.println("[API] updateSessionItem called");
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] WiFi not connected, skipping");
    return;
  }
  if (currentSessionId <= 0) {
    Serial.println("[API] No active session, skipping");
    return;
  }
  
  HTTPClient http;
  String url = String(API_BASE_URL) + "/api/sessions/" + String(currentSessionId) + "/items";
  Serial.print("[API] Posting to: ");
  Serial.println(url);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<128> doc;
  doc["ballTypeId"] = ballTypeId;
  doc["count"] = 1;  // Always send 1 to increment server count
  String json;
  serializeJson(doc, json);
  Serial.print("[API] JSON payload: ");
  Serial.println(json);
  
  int httpCode = http.POST(json);
  Serial.print("[API] Response code: ");
  Serial.println(httpCode);
  if (httpCode == 200) {
    Serial.print("[API] Item updated: type=");
    Serial.print(ballTypeId);
    Serial.print(" count=");
    Serial.println(count);
  } else {
    Serial.println("[API] Item update FAILED");
  }
  http.end();
}
#endif

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Print setup stage messages to serial
static inline void stage(const char* s) { Serial.println(s); }

// Map raw touch coordinates to screen coordinates
int mapTouchX(int xRaw) { return map(xRaw, TS_MINX, TS_MAXX, 0, tft.width()); }
int mapTouchY(int yRaw) { int y = map(yRaw, TS_MINY, TS_MAXY, 0, tft.height()); return tft.height() - 1 - y; }

// Check if touch point hits a UI button
bool hitBtn(const Button& b, int tx, int ty) {
  return (tx >= b.x && tx < (b.x + b.w) && ty >= b.y && ty < (b.y + b.h));
}

// Check if touch point hits a slider (currently unused)
bool hitSlider(const Slider& s, int tx, int ty) {
  return (tx >= s.x && tx < (s.x + s.w) && ty >= s.y && ty < (s.y + s.h));
}

// DC Motor Control Functions
void motorStop() { ledcWrite(RPWM_PIN, 0); ledcWrite(LPWM_PIN, 0); }
void motorForward(uint8_t pwm) { ledcWrite(LPWM_PIN, 0); ledcWrite(RPWM_PIN, pwm); }
void motorReverse(uint8_t pwm) { ledcWrite(RPWM_PIN, 0); ledcWrite(LPWM_PIN, pwm); }

// Read raw IR sensor state
bool readIrRawDetected() {
  int v = digitalRead(IR_PIN);
  return IR_ACTIVE_LOW ? (v == LOW) : (v == HIGH);
}

// Apply motor and stepper settings based on current state
void applyOutputs() {
  // Stepper always enabled (controlled directly via moveTo commands)
  digitalWrite(STEPPER_EN_PIN, LOW);
  stepper.setMaxSpeed(stepperMaxSpeed);
  stepper.setAcceleration(stepperAccel);
  
  // DC Motor control - motorRunning flag (Start/Stop button)
  if (!motorRunning || irDetected) {
    motorStop();
  } else {
    motorReverse(motorPwm);  // Always reverse
  }
}

// ============================================================================
// UI DRAWING FUNCTIONS
// ============================================================================

// Draw a button with on/off state
void drawButton(const Button& b, bool on) {
  uint16_t fill = on ? ILI9341_GREEN : ILI9341_DARKGREY;
  uint16_t text = on ? ILI9341_BLACK : ILI9341_WHITE;
  tft.fillRoundRect(b.x, b.y, b.w, b.h, 10, fill);
  tft.drawRoundRect(b.x, b.y, b.w, b.h, 10, ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setTextColor(text);
  int16_t x1, y1; uint16_t tw, th;
  tft.getTextBounds(b.label, 0, 0, &x1, &y1, &tw, &th);
  tft.setCursor(b.x + (b.w - tw) / 2, b.y + (b.h - th) / 2);
  tft.print(b.label);
}

// Draw a button with custom label and state
void drawButton(const Button& b, const char* label, bool on) {
  uint16_t fill = on ? ILI9341_GREEN : ILI9341_DARKGREY;
  uint16_t text = on ? ILI9341_BLACK : ILI9341_WHITE;
  tft.fillRoundRect(b.x, b.y, b.w, b.h, 10, fill);
  tft.drawRoundRect(b.x, b.y, b.w, b.h, 10, ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setTextColor(text);
  int16_t x1, y1; uint16_t tw, th;
  tft.getTextBounds(label, 0, 0, &x1, &y1, &tw, &th);
  tft.setCursor(b.x + (b.w - tw) / 2, b.y + (b.h - th) / 2);
  tft.print(label);
}

// Draw the detected ball image with color-coded 3D sphere
void drawBallImage() {
  static bool ballDrawn = false;
  static int lastDrawnBall = -1;  // Track which ball was drawn
  int W = tft.width();
  int btnX = W - 110 - 8;  // Button X position
  int leftSpace = btnX;  // Space on left side
  
  int size = 100;
  // Center in left space
  int x = (leftSpace - size) / 2;
  int y = 50;
  
  int cx = x + size/2;
  int cy = y + size/2;
  int r = size/2 - 5;
  
  if (ballDetected == 0) {
    // Clear area and show NO BALL
    tft.fillRect(x - 5, y - 5, size + 10, size + 10, ILI9341_BLACK);
    const char* txt = "NO BALL";
    tft.setTextSize(2);
    tft.setTextColor(ILI9341_WHITE);
    int16_t x1, y1; uint16_t tw, th;
    tft.getTextBounds(txt, 0, 0, &x1, &y1, &tw, &th);
    tft.setCursor((leftSpace - tw) / 2, y + 45);
    tft.print(txt);
    ballDrawn = false;  // Reset for next ball
    lastDrawnBall = 0;
    return;
  }
  
  // Redraw if ball type changed
  if (ballDetected != lastDrawnBall) {
    ballDrawn = false;
    lastDrawnBall = ballDetected;
  }
  
  // Only draw once when ball is detected (no animation)
  if (!ballDrawn) {
    // Get ball color
    const char* ballName = "";
    switch(ballDetected) {
      case 1: ballName = "SOCCER"; break;
      case 2: ballName = "VOLLEY"; break;
      case 3: ballName = "BASKET"; break;
    }
    
    // Clear area
    tft.fillRect(x - 5, y - 5, size + 10, size + 10, ILI9341_BLACK);
    
    // Draw 3D sphere with gradient circles (darker to lighter from center)
    for (int i = r; i > 0; i -= 3) {
      // Calculate brightness based on distance from edge
      float brightness = (float)(r - i) / (float)r;
      uint16_t shadeColor;
      
      // Apply gradient based on ball color
      if (ballDetected == 1) { // Green
        uint8_t g = 255 * (0.3 + 0.7 * brightness);
        shadeColor = tft.color565(0, g, 0);
      } else if (ballDetected == 2) { // Cyan
        uint8_t gb = 255 * (0.3 + 0.7 * brightness);
        shadeColor = tft.color565(0, gb, gb);
      } else { // Orange
        uint8_t r_val = 255 * (0.3 + 0.7 * brightness);
        uint8_t g_val = 165 * (0.3 + 0.7 * brightness);
        shadeColor = tft.color565(r_val, g_val, 0);
      }
      tft.fillCircle(cx, cy, i, shadeColor);
    }
    
    // Add white highlight for 3D effect (top-left)
    int hx = cx - r/4;
    int hy = cy - r/4;
    tft.fillCircle(hx, hy, r/5, ILI9341_WHITE);
    
    // Outer edge
    tft.drawCircle(cx, cy, r, ILI9341_WHITE);
    
    // Draw ball name below (centered)
    tft.setTextSize(2);
    tft.setTextColor(ILI9341_WHITE);
    int16_t x1, y1; uint16_t tw, th;
    tft.getTextBounds(ballName, 0, 0, &x1, &y1, &tw, &th);
    tft.setCursor((leftSpace - tw) / 2, y + size + 5);
    tft.print(ballName);
    
    ballDrawn = true;  // Mark as drawn
  }
}

// Draw the processed ball counter
void drawProcessedCount() {
  int W = tft.width();
  int btnX = W - 110 - 8;
  int leftSpace = btnX;
  
  // Build text - just show count
  char buf[32];
  snprintf(buf, sizeof(buf), "Count: %d", processedBalls);
  
  // Center in left space
  tft.setTextSize(2);
  int16_t x1, y1; uint16_t tw, th;
  tft.getTextBounds(buf, 0, 0, &x1, &y1, &tw, &th);
  
  int x = (leftSpace - tw) / 2;
  int y = 165;
  
  // Clear wider area to handle text changes
  tft.fillRect(0, y, leftSpace, th + 4, ILI9341_BLACK);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(x, y);
  tft.print(buf);
}

// Draw the IR sensor status indicator (top-right)
void drawIrIndicator() {
  // Top right position (next to title bar)
  int x = tft.width() - 65;
  int y = 4;
  tft.fillRect(x, y, 60, 18, ILI9341_NAVY);
  tft.setTextSize(1);
  tft.setCursor(x + 2, y + 5);
  if (irDetected) { tft.setTextColor(ILI9341_YELLOW); tft.print("IR: HIT"); }
  else            { tft.setTextColor(ILI9341_WHITE);  tft.print("IR: OK"); }
}

// Calculate UI element positions based on screen dimensions
void layoutUI() {
  int W = tft.width();
  int H = tft.height();
  int m = 8;
  
  // Right side buttons (centered vertically between blue bar and bottom)
  int btnW = 110;  // Wider buttons
  int btnH = 50;
  int btnX = W - btnW - m;
  int btnSpacing = 10;
  
  // Calculate vertical center between title bar (26px) and bottom
  int availableHeight = H - 26;  // Space below title bar
  int totalBtnHeight = 3 * btnH + 2 * btnSpacing;
  int btnY = 26 + (availableHeight - totalBtnHeight) / 2;
  
  btnAdjust    = { btnX, btnY, btnW, btnH, "ADJUST" };
  btnAnalyse   = { btnX, btnY + btnH + btnSpacing, btnW, btnH, "ANALYSE" };
  btnStartStop = { btnX, btnY + 2 * (btnH + btnSpacing), btnW, btnH, "START" };
  
  // Debug button in bottom left (bigger)
  btnDebug = { 8, H - 48, 45, 40, "D" };
}

// SPI device selection helpers (prevents conflicts between TFT and touch)
inline void selectTFT() { digitalWrite(TOUCH_CS, HIGH); digitalWrite(TFT_CS, LOW); }
inline void deselectTFT() { digitalWrite(TFT_CS, HIGH); }

// Draw the complete main UI screen
void drawUI() {
  selectTFT();
  
  tft.fillScreen(ILI9341_BLACK);
  layoutUI();
  
  // Draw title bar
  tft.fillRect(0, 0, tft.width(), 26, ILI9341_NAVY);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(8, 5);
  tft.print("Ball Control");
  
  // Draw debug button (bottom left, bigger)
  tft.fillRoundRect(btnDebug.x, btnDebug.y, btnDebug.w, btnDebug.h, 8, ILI9341_DARKGREY);
  tft.drawRoundRect(btnDebug.x, btnDebug.y, btnDebug.w, btnDebug.h, 8, ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  int16_t dx1, dy1; uint16_t dtw, dth;
  tft.getTextBounds("D", 0, 0, &dx1, &dy1, &dtw, &dth);
  tft.setCursor(btnDebug.x + (btnDebug.w - dtw) / 2, btnDebug.y + (btnDebug.h - dth) / 2);
  tft.print("D");
  
  // Draw left side: ball image and counter
  drawBallImage();
  drawProcessedCount();
  
  // Draw right side: buttons
  drawButton(btnAdjust, false);
  drawButton(btnAnalyse, false);
  drawButton(btnStartStop, "START", motorRunning);
  
  // Draw top right: IR indicator
  drawIrIndicator();
  
  deselectTFT();
}

// Draw the debug information screen
void drawDebugScreen() {
  selectTFT();
  tft.fillScreen(ILI9341_BLACK);
  
  // Title
  tft.fillRect(0, 0, tft.width(), 26, ILI9341_NAVY);
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(8, 5);
  tft.print("DEBUG MODE");
  
  // Settings display
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_CYAN);
  int y = 35;
  int lh = 12;
  
  tft.setCursor(8, y); tft.print("Motor PWM: "); tft.print(motorPwm); y += lh;
  tft.setCursor(8, y); tft.print("Stepper Speed: "); tft.print((int)stepperMaxSpeed); y += lh;
  tft.setCursor(8, y); tft.print("Stepper Accel: "); tft.print((int)stepperAccel); y += lh;
  tft.setCursor(8, y); tft.print("Stepper Pos: "); tft.print(stepper.currentPosition()); y += lh;
  tft.setCursor(8, y); tft.print("Ball Debounce: "); tft.print((int)BALL_DEBOUNCE_MS); tft.print("ms"); y += lh;
  tft.setCursor(8, y); tft.print("IR Valid Time: "); tft.print((int)IR_VALID_TIME_MS); tft.print("ms"); y += lh;
  y += lh;
  
  tft.setTextColor(ILI9341_YELLOW);
  tft.setCursor(8, y); tft.print("WiFi: "); 
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(ILI9341_GREEN);
    tft.print("Connected");
  } else {
    tft.setTextColor(ILI9341_RED);
    tft.print("Disconnected");
  }
  y += lh * 2;
  
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(8, y); tft.print("Session ID: "); tft.print(currentSessionId); y += lh;
  tft.setCursor(8, y); tft.print("Processed Balls: "); tft.print(processedBalls); y += lh;
  
  // Exit button
  tft.fillRoundRect(10, tft.height() - 40, 100, 32, 8, ILI9341_RED);
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(25, tft.height() - 34);
  tft.print("EXIT");
  
  deselectTFT();
}

// ============================================================================
// PARTIAL UPDATE FUNCTIONS
// ============================================================================

// Update a single button without redrawing entire screen
void updateButtonDisplay(const Button& b, bool on) {
  selectTFT();
  drawButton(b, on);
  deselectTFT();
}

// Update IR sensor state with debouncing and stop motor if triggered
void updateIrState() {
  bool raw = readIrRawDetected();
  
  // Track wanneer IR voor het eerst actief werd
  if (raw && !irRawState) {
    irFirstDetectedMs = millis();
  }
  irRawState = raw;
  
  // Alleen valideren als IR lang genoeg actief is
  bool newIrDetected = false;
  if (raw && (millis() - irFirstDetectedMs >= IR_VALID_TIME_MS)) {
    newIrDetected = true;
  }
  
  // Update alleen als status veranderd is
  if (newIrDetected != irDetected) {
    irDetected = newIrDetected;
    if (irDetected) {
      Serial.println("[IR] VALIDATED detection after 100ms");
      if (motorRunning) {
        motorRunning = false;
        applyOutputs();
        selectTFT();
        drawButton(btnStartStop, "START", false);
        deselectTFT();
      }
    }
    
    // Update IR indicator
    selectTFT();
    drawIrIndicator();
    deselectTFT();
  }
}

// Process incoming UART ball detection data from camera
void handleUARTBallData(int received) {
  if (received != ballDetected) {
    ballDetected = received;
    lastBallChangeMs = millis();
    Serial.print("[UART] Ball changed to: ");
    switch(received) {
      case 1: Serial.println("SOCCER"); break;
      case 2: Serial.println("VOLLEYBALL"); break;
      case 3: Serial.println("BASKETBALL"); break;
      default: Serial.println("NONE"); break;
    }
    
    // Update ball image immediately
    selectTFT();
    drawBallImage();
    deselectTFT();
  }
  
  // Update stable ball tracking (no automatic actions)
  if (ballDetected != lastStableBall && (millis() - lastBallChangeMs > BALL_DEBOUNCE_MS)) {
    previousStableBall = lastStableBall;
    lastStableBall = ballDetected;
    Serial.print("[STABLE] Ball confirmed: ");
    switch(lastStableBall) {
      case 1: Serial.println("SOCCER"); break;
      case 2: Serial.println("VOLLEYBALL"); break;
      case 3: Serial.println("BASKETBALL"); break;
      default: Serial.println("NONE"); break;
    }
  }
}

// Read touch input with debouncing (returns true only on initial touch)
bool readTouchOnce(int &tx, int &ty) {
#if !ENABLE_TOUCH
  (void)tx; (void)ty;
  return false;
#else
  bool touchedNow = ts.touched();
  if (!touchedNow) { prevTouched = false; return false; }
  if (prevTouched) return false;
  if (millis() - lastTouchMs < TOUCH_DEBOUNCE_MS) return false;
  lastTouchMs = millis();
  prevTouched = true;
  digitalWrite(TFT_CS, HIGH);
  TS_Point p = ts.getPoint();
  digitalWrite(TOUCH_CS, HIGH);
  tx = mapTouchX(p.x);
  ty = mapTouchY(p.y);
  return true;
#endif
}

// ============================================================================
// SETUP - HARDWARE INITIALIZATION
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(200);
  
  // Stage 1: Initialize SPI chip select pins
  stage("STAGE 1: CS pins stable");
  pinMode(TFT_CS, OUTPUT);   digitalWrite(TFT_CS, HIGH);
  pinMode(TFT_DC, OUTPUT);
  pinMode(TOUCH_CS, OUTPUT); digitalWrite(TOUCH_CS, HIGH);
  
  // Hardware reset for TFT display
  if (TFT_RST != -1) {
    pinMode(TFT_RST, OUTPUT);
    digitalWrite(TFT_RST, HIGH);
    delay(10);
    digitalWrite(TFT_RST, LOW);
    delay(20);
    digitalWrite(TFT_RST, HIGH);
    delay(120);
  }
  
  // Stage 2: Initialize SPI bus
  stage("STAGE 2: SPI begin");
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI);
  
  // Stage 3: Initialize TFT display and run color test
  stage("STAGE 3: TFT begin");
  tft.begin();
  tft.setRotation(1);
  tft.setSPISpeed(8000000);
  tft.fillScreen(ILI9341_RED);   delay(200);
  tft.fillScreen(ILI9341_GREEN); delay(200);
  tft.fillScreen(ILI9341_BLUE);  delay(200);
  tft.fillScreen(ILI9341_BLACK);
  tft.setCursor(10, 10);
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("TFT OK");
  
  // Stage 4: Initialize motors (stepper and DC)
  stage("STAGE 4: Motor pins init");
  pinMode(STEPPER_EN_PIN, OUTPUT);
  digitalWrite(STEPPER_EN_PIN, HIGH);
  stepper.setPinsInverted(true, false, false);  // Invert direction pin
  stepper.setMaxSpeed(stepperMaxSpeed);
  stepper.setAcceleration(stepperAccel);
  stepper.setCurrentPosition(TRAVEL);  // Start at max position (9000)
  pinMode(REN_PIN, OUTPUT);
  pinMode(LEN_PIN, OUTPUT);
  digitalWrite(REN_PIN, HIGH);
  digitalWrite(LEN_PIN, HIGH);
  ledcAttach(RPWM_PIN, PWM_FREQ, PWM_RES);
  ledcAttach(LPWM_PIN, PWM_FREQ, PWM_RES);
  motorStop();
  
  // Stage 5: Initialize IR proximity sensor
  stage("STAGE 5: IR init");
  pinMode(IR_PIN, INPUT_PULLUP);
  irDetected = readIrRawDetected();
  
#if ENABLE_API
  // Stage 5.5: Connect to WiFi network
  stage("STAGE 5.5: WiFi init");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.print("[WiFi] Connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("");
    Serial.println("[WiFi] Connection failed");
  }
#endif

#if ENABLE_UART_RX
  // Stage 6: Initialize UART communication with camera module
  stage("STAGE 6: UART RX init (ball detection)");
  pinMode(RX_PIN, INPUT);  // Explicit RX pin mode
  Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
  delay(100);  // Let UART stabilize
  Serial.print("[UART] Initialized - RX on GPIO");
  Serial.println(RX_PIN);
  Serial.println("[UART] Waiting for data from camera...");
  Serial.print("[UART] Serial2 ready: ");
  Serial.println(Serial2 ? "YES" : "NO");
#endif

  // Stage 7: Draw main user interface
  stage("STAGE 7: Draw UI");
  drawUI();
  applyOutputs();
  
#if ENABLE_TOUCH
  // Stage 8: Initialize touch controller
  stage("STAGE 8: Touch begin");
  ts.begin();
  ts.setRotation(1);
#endif

  stage("SETUP DONE");
}

// ============================================================================
// MAIN LOOP
// ============================================================================

void loop() {
  static unsigned long lastDebug = 0;
  
  // Priority 1: Run stepper motor (call multiple times per loop for smooth motion)
  for (int i = 0; i < 5; i++) {
    stepper.run();
  }
  
  // Safety limits: prevent stepper from exceeding travel range
  if (stepper.currentPosition() < 0) {
    stepper.setCurrentPosition(0);
    stepper.stop();
  }
  if (stepper.currentPosition() > TRAVEL) {
    stepper.setCurrentPosition(TRAVEL);
    stepper.stop();
  }
  
  // Update IR sensor state and handle motor stop if triggered
  updateIrState();
  
#if ENABLE_API
  // Poll server for new commands (only when stepper is idle)
  bool isMoving = (stepper.distanceToGo() != 0);
  if (!isMoving && millis() - lastCommandPoll > COMMAND_POLL_INTERVAL) {
    lastCommandPoll = millis();
    pollNextCommand();
  }
#endif
  
  // Debug output: print status every 5 seconds (when idle)
  if (stepper.distanceToGo() == 0) {
    if (millis() - lastDebug > 5000) {
      lastDebug = millis();
      Serial.printf("[DEBUG] Ball:%d UART:%d bytes\n", ballDetected, Serial2.available());
    }
  }
  
#if ENABLE_UART_RX
  // Process incoming UART data from camera module
  while (Serial2.available() > 0) {
    int received = Serial2.read();
    if (received >= 0 && received <= 3) {
      handleUARTBallData(received);
    }
  }
#endif
  
  // Process touch screen input
  int tx, ty;
  if (readTouchOnce(tx, ty)) {
    
    // Debug button: toggle debug screen
    if (hitBtn(btnDebug, tx, ty)) {
      debugMode = !debugMode;
      if (debugMode) {
        drawDebugScreen();
      } else {
        drawUI();
      }
      Serial.print("[DEBUG] Debug mode: ");
      Serial.println(debugMode ? "ON" : "OFF");
      return;  // Skip other buttons when toggling debug mode
    }
    
    // Exit button in debug mode
    if (debugMode) {
      Button exitBtn = { 10, tft.height() - 40, 100, 32, "EXIT" };
      if (hitBtn(exitBtn, tx, ty)) {
        debugMode = false;
        drawUI();
        Serial.println("[DEBUG] Exited debug mode");
      }
      return;  // No other buttons respond in debug mode
    }
    
    // ADJUST button: move stepper to preset position for detected ball
    if (hitBtn(btnAdjust, tx, ty)) {
      if (lastStableBall > 0) {
        lastStepperStartMs = millis();
        long targetPos = 0;
        switch(lastStableBall) {
          case 1: targetPos = PRESET_SOCCER; break;
          case 2: targetPos = PRESET_VOLLEYBALL; break;
          case 3: targetPos = PRESET_BASKETBALL; break;
        }
        stepper.moveTo(targetPos);
        Serial.print("[ADJUST] Moving to position: ");
        Serial.println(targetPos);
      } else {
        Serial.println("[ADJUST] No ball detected - ignored");
      }
    }
    // ANALYSE button: trigger camera AI and process result
    else if (hitBtn(btnAnalyse, tx, ty)) {
      Serial.println("[ANALYSE] Button clicked - triggering camera AI...");
      
      // Send HTTP GET to camera /trigger endpoint to request AI analysis
      HTTPClient http;
      String triggerUrl = String("http://") + CAMERA_IP + "/trigger";
      
      http.begin(triggerUrl);
      int httpCode = http.GET();
      
      if (httpCode == 200) {
        Serial.println("[ANALYSE] Camera AI triggered successfully!");
        Serial.println("[ANALYSE] Camera will analyze and send UART ball code...");
        Serial.println("[ANALYSE] Waiting for UART detection (3-4 seconds)...");
      } else {
        Serial.print("[ANALYSE] Failed to trigger camera, code: ");
        Serial.println(httpCode);
      }
      
      http.end();
      
      // Wait a bit for the analysis to complete and UART to arrive
      delay(100);
      
      // Process ball every time ANALYSE is pressed
      if (lastStableBall > 0) {
        // Map UART codes to database IDs
        int ballTypeId = 0;
        const char* ballName = "";
        switch(lastStableBall) {
          case 1: ballTypeId = 2; ballName = "Soccer"; break;  // Soccer
          case 2: ballTypeId = 3; ballName = "Volleyball"; break;  // Volleyball
          case 3: ballTypeId = 1; ballName = "Basketball"; break;  // Basketball
        }
        
        processedBalls++;
        Serial.print("[ANALYSE] Processed ");
        Serial.print(ballName);
        Serial.print(" ball - total: ");
        Serial.println(processedBalls);
        
        // Update display
        selectTFT();
        drawProcessedCount();
        deselectTFT();
        
#if ENABLE_API
        // Send to API every time
        if (currentSessionId > 0) {
          static int ballCounts[4] = {0, 0, 0, 0};
          ballCounts[ballTypeId]++;
          updateSessionItem(ballTypeId, ballCounts[ballTypeId]);
          Serial.print("[API] Sent to server: ");
          Serial.print(ballName);
          Serial.print(" count=");
          Serial.println(ballCounts[ballTypeId]);
        } else {
          Serial.println("[ANALYSE] No active session - skipping API update");
        }
#endif
        
        // Update previous for next detection
        previousStableBall = lastStableBall;
      } else {
        Serial.println("[ANALYSE] No ball detected - ignored");
      }
    }
    // START/STOP button: toggle DC conveyor motor
    else if (hitBtn(btnStartStop, tx, ty)) {
      motorRunning = !motorRunning;
      Serial.print("[START/STOP] DC motor: ");
      Serial.println(motorRunning ? "RUNNING" : "STOPPED");
      applyOutputs();
      selectTFT();
      drawButton(btnStartStop, motorRunning ? "STOP" : "START", motorRunning);
      deselectTFT();
    }
  }
}