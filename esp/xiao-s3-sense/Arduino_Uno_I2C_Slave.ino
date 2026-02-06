/*
 * Arduino Uno I2C Slave Code
 * Upload this to your Arduino Uno
 *
 * Wiring:
 * Arduino Uno A4 (SDA) --> ESP32-S3 GPIO5 (SDA)
 * Arduino Uno A5 (SCL) --> ESP32-S3 GPIO6 (SCL)
 * Arduino Uno GND --> ESP32-S3 GND
 *
 * Add 4.7kΩ pull-up resistors from SDA to 5V and SCL to 5V
 * (or use 10kΩ if you don't have 4.7kΩ)
 */

#include <Wire.h>

#define MY_I2C_ADDRESS 10 // Must match OTHER_ARDUINO in ESP32 code

void setup()
{
    Serial.begin(115200);
    Serial.println("=== Arduino Uno I2C Slave Starting ===");
    Serial.print("I2C Address: ");
    Serial.println(MY_I2C_ADDRESS);
    Serial.println("Waiting for I2C messages...");

    Wire.begin(MY_I2C_ADDRESS);   // Join I2C bus with address 10
    Wire.onReceive(receiveEvent); // Register event handler
    Wire.onRequest(requestEvent); // Register request handler
}

void loop()
{
    // Send a test message to ESP32 every 5 seconds
    static unsigned long lastSend = 0;
    if (millis() - lastSend > 5000)
    {
        lastSend = millis();

        // Send int command
        Wire.beginTransmission(25); // ESP32 address
        Wire.write(42);
        byte error = Wire.endTransmission();

        Serial.print("[I2C TX] Sent int 42 to ESP32, result: ");
        if (error == 0)
        {
            Serial.println("OK");
        }
        else
        {
            Serial.print("ERROR ");
            Serial.println(error);
        }
    }

    delay(100);
}

// Function that executes when data is received from master
void receiveEvent(int howMany)
{
    Serial.print("[I2C RX] Received ");
    Serial.print(howMany);
    Serial.print(" bytes: ");

    if (howMany == 1)
    {
        // Single byte - treat as integer
        int value = Wire.read();
        Serial.print("Int value: ");
        Serial.println(value);
    }
    else
    {
        // Multiple bytes - treat as string
        String message = "";
        while (Wire.available())
        {
            char c = Wire.read();
            message += c;
        }
        Serial.print("String: '");
        Serial.print(message);
        Serial.println("'");
    }
}

// Function that executes when data is requested by master
void requestEvent()
{
    // Send response if ESP32 requests data
    Wire.write("UnoOK");
    Serial.println("[I2C Request] Sent 'UnoOK' response");
}
