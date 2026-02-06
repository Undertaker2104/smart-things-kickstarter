#pragma once

#include <Arduino.h>

class Communication
{
public:
    Communication();
    ~Communication();

    void Transmit(int value);
    void Transmit(char *msg);

private:
    // UART uses Serial2
};
