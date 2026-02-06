#include <Arduino.h>

// Define camera model BEFORE including camera_pins.h
#define CAMERA_MODEL_XIAO_ESP32S3

#include "esp_camera.h"
#include "camera_pins.h"
#include "app_http.h"
#include "communication.h"
#include <WiFi.h>

// WiFi credentials
const char* ssid = "";
const char* password = "";

// Communication object for UART transmission
Communication Comm;

// Track last ball detection to keep retransmitting
// This variable should be updated by AI detection in app_http.cpp
extern volatile int lastBallDetected;
volatile int lastBallDetected = 0;
unsigned long lastTransmitTime = 0;
const unsigned long RETRANSMIT_INTERVAL = 1000; // Retransmit every 1 second

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  // Camera config
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  // Init camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);

  // Connect WiFi
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");

  // Start camera server
  startCameraServer();
  
  Serial.println("\n=== Ball Detection System Ready ===");
  Serial.println("[UART] Transmitter ready on GPIO6");
  Serial.println("[INFO] Use web interface for AI ball detection");
  Serial.print("[INFO] Camera IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Continuously retransmit last known ball detection
  // This ensures display always has the correct value even with comm errors
  if (millis() - lastTransmitTime >= RETRANSMIT_INTERVAL) {
    lastTransmitTime = millis();
    Comm.Transmit(lastBallDetected);
    
    // Optional: log only on changes
    static int lastLoggedValue = -1;
    if (lastBallDetected != lastLoggedValue) {
      Serial.print("[UART] Retransmitting ball code: ");
      Serial.println(lastBallDetected);
      lastLoggedValue = lastBallDetected;
    }
  }
  
  delay(10);
}
