#include "communication.h"

// UART Configuration - GPIO6 TX to send to display
#define TX_PIN 6
#define RX_PIN -1  // Not used - transmit only

Communication::Communication()
{
    // Initialize UART for transmission
    // Serial2.begin(baud, config, RX_pin, TX_pin)
    Serial2.begin(9600, SERIAL_8N1, RX_PIN, TX_PIN);
    delay(100);  // Let UART stabilize
    Serial.println("[UART] Communication initialized on GPIO6 (TX), GPIO7 (RX)");
    Serial.print("[UART] Serial2 ready: ");
    Serial.println(Serial2 ? "YES" : "NO");
}

Communication::~Communication() {}

void Communication::Transmit(int value)
{
    Serial.printf("[UART TX] Sending value: %d\n", value);
    Serial2.write((uint8_t)value);
    Serial2.flush();
    Serial.println("[UART TX] Sent!");
}

void Communication::Transmit(char *msg)
{
    Serial.printf("[UART TX] Sending message: %s\n", msg);
    Serial2.write((uint8_t *)msg, strlen(msg));
    Serial2.flush();
    Serial.println("[UART TX] Sent!");
}
