# ESP32-S3 Bal Detectie en Sorteer Systeem

## Overzicht

Dit project implementeert een geautomatiseerd bal detectie en sorteer systeem met twee ESP32-S3 modules:
- **Display Module (ESP32-S3 DevKitM-1)**: Hoofd besturingseenheid met TFT display, touch interface en motorbesturing
- **Camera Module (XIAO ESP32-S3 Sense)**: AI-gestuurde bal detectie via browser-gebaseerd TensorFlow.js model

Het systeem kan drie soorten ballen detecteren en categoriseren (Voetbal, Volleybal, Basketbal), deze positioneren met een stappenmotor, en transporteren via een DC motor transportband.

## Hardware Componenten

### Display Module (Dit Project)
- **MCU**: ESP32-S3 DevKitM-1
- **Display**: ILI9341 320x240 TFT (SPI)
- **Touch**: XPT2046 Touch Controller
- **Stappenmotor**: Bestuurd via DIR/STEP driver
- **DC Motor**: BTS7960 H-Bridge driver
- **IR Sensor**: Nabijheidsdetectie (GPIO15)
- **UART**: Ontvangt bal detectie codes van camera module

### Camera Module (Apart Apparaat)
- **MCU**: XIAO ESP32-S3 Sense met camera
- **IP Adres**: 10.139.61.247 (instelbaar)
- **Communicatie**: UART TX (GPIO6) → Display RX (GPIO16)
- **Functie**: Draait AI bal detectie in browser, stuurt codes via UART

## Pin Toewijzingen

### SPI Bus
| Pin | Functie |
|-----|----------|
| GPIO 11 | MOSI |
| GPIO 12 | SCK |
| GPIO 13 | MISO |

### TFT Display (ILI9341)
| Pin | Functie |
|-----|----------|
| GPIO 10 | CS |
| GPIO 9  | DC |
| GPIO 8  | RST |

### Touch Controller (XPT2046)
| Pin | Functie |
|-----|----------|
| GPIO 3  | CS |
| GPIO 21 | IRQ |

### Stappenmotor
| Pin | Functie |
|-----|----------|
| GPIO 4 | STEP |
| GPIO 5 | DIR |
| GPIO 6 | ENABLE |

### DC Motor (BTS7960)
| Pin | Functie |
|-----|----------|
| GPIO 1  | RPWM (Vooruit) |
| GPIO 2  | LPWM (Achteruit) |
| GPIO 42 | REN (Right Enable) |
| GPIO 35 | LEN (Left Enable) |

### Sensoren & Communicatie
| Pin | Functie |
|-----|----------|
| GPIO 15 | IR Nabijheidssensor |
| GPIO 16 | UART RX (van camera) |

## Functionaliteiten

### Display & Gebruikersinterface
- **Hoofdscherm**:
  - Bal type weergave met gekleurde 3D bollen (Groen=Voetbal, Cyaan=Volleybal, Oranje=Basketbal)
  - Verwerkte ballen teller
  - Drie actie knoppen: ADJUST, ANALYSE, START/STOP
  - IR sensor status indicator
  - Debug knop (linksonder)

- **Debug Scherm**:
  - Motor instellingen (PWM, snelheid, acceleratie)
  - Stappenmotor positie
  - WiFi verbindingsstatus
  - API sessie informatie
  - Verwerkte ballen telling

### Bal Detectie Werkwijze
1. Gebruiker klikt **ANALYSE** knop
2. Display stuurt HTTP GET naar camera's `/trigger` endpoint
3. Camera triggert browser-gebaseerde AI analyse (3 seconden)
4. Camera stuurt bal code via UART (0=Geen, 1=Voetbal, 2=Volleybal, 3=Basketbal)
5. Display update UI met gedetecteerde bal
6. Bal telling neemt toe en synchroniseert met backend API
7. Gebruiker kan **ADJUST** klikken om stappenmotor naar preset positie te bewegen

### Motor Besturing

#### Stappenmotor (Positie Controle)
- **Bereik**: 0 - 9000 stappen
- **Snelheid**: 3000 stappen/seconde
- **Acceleratie**: 1000 stappen/seconde²
- **Presets**:
  - Volleybal: 4500 stappen
  - Voetbal: 5000 stappen
  - Basketbal: 9000 stappen (max)

#### DC Motor (Transportband)
- **Driver**: BTS7960 H-Bridge
- **PWM**: 20 kHz, 8-bit resolutie
- **Snelheid**: 100/255 (39%)
- **Richting**: Altijd achteruit
- **Besturing**: START/STOP knop
- **Veiligheid**: Stopt automatisch wanneer IR sensor getriggerd wordt

### API Integratie

#### WiFi Configuratie
```cpp
SSID: ""
Wachtwoord: ""
Server: http://145.24.237.126:8000
```

#### API Endpoints
- `POST /api/commands/next` - Poll voor commando's
- `POST /api/commands/{id}/success` - Markeer commando als voltooid
- `POST /api/commands/{id}/failed` - Markeer commando als mislukt
- `POST /api/sessions/start` - Start cleaning sessie
- `POST /api/sessions/{id}/stop` - Stop cleaning sessie
- `POST /api/sessions/{id}/items` - Update bal telling

#### Bal Type Mapping
| UART Code | Bal Type    | API ID |
|-----------|-------------|--------|
| 1         | Voetbal     | 2      |
| 2         | Volleybal   | 3      |
| 3         | Basketbal   | 1      |

## Configuratie

### Camera Instellingen
```cpp
const char* CAMERA_IP = "10.139.61.247";
```
- Camera moet op hetzelfde WiFi netwerk zijn
- Browser moet open zijn op camera webpagina voor AI functionaliteit
- Auto-trigger polling: 500ms intervallen

### Debounce & Timing
```cpp
BALL_DEBOUNCE_MS = 2000        // Bal moet 2 seconden stabiel zijn
IR_VALID_TIME_MS = 100         // IR detectie debounce
TOUCH_DEBOUNCE_MS = 160        // Touch input debounce
COMMAND_POLL_INTERVAL = 2000   // API polling interval
```

### Functie Schakelaars
```cpp
#define ENABLE_TOUCH 1      // Touch screen inschakelen
#define ENABLE_UART_RX 1    // Camera communicatie inschakelen
#define ENABLE_API 1        // WiFi en API inschakelen
```

## Kalibratie

### Touch Screen
```cpp
TS_MINX = 250    TS_MAXX = 3800
TS_MINY = 200    TS_MAXY = 3900
```

### IR Sensor
```cpp
IR_ACTIVE_LOW = true  // Zet op false als sensor logica omgekeerd is
```

## Bouwen & Uploaden

### PlatformIO
```bash
# Compileren
pio run

# Uploaden
pio run --target upload

# Monitor
pio device monitor
```

### Afhankelijkheden
- Adafruit_GFX @ 1.12.4
- Adafruit_ILI9341 @ 1.6.2
- XPT2046_Touchscreen @ 0.0.0-alpha
- AccelStepper @ 1.64.0
- ArduinoJson @ 7.4.2
- HTTPClient (ESP32 core)
- WiFi (ESP32 core)

## Gebruik

### Opstart Volgorde
1. TFT kleurentest (Rood → Groen → Blauw → Zwart)
2. Motor initialisatie
3. WiFi verbinding (20 pogingen)
4. UART initialisatie
5. UI weergave

### Normale Werking
1. **Start Sessie**: Backend stuurt `START_CLEANING` commando
2. **Plaats Bal**: Systeem detecteert bal via camera
3. **Analyseren**: Klik ANALYSE knop om bal type te identificeren
4. **Positioneren**: Klik ADJUST om stappenmotor naar preset positie te bewegen
5. **Transporteren**: Klik START om transportband te starten
6. **Veiligheid**: IR sensor stopt motor automatisch wanneer bal weggaat
7. **Herhalen**: Verwerk volgende bal
8. **Einde Sessie**: Backend stuurt `STOP_CLEANING` commando

### Debug Modus
- Druk op **D** knop (linksonder) om debug scherm te openen
- Bekijk real-time motor instellingen en systeem status
- Druk op **EXIT** om terug te keren naar hoofdscherm

## Seriële Output

### Debug Berichten
```
[UART] Ball changed to: SOCCER
[STABLE] Ball confirmed: SOCCER
[ANALYSE] Processed Soccer ball - total: 1
[API] Sent to server: Soccer count=1
[IR] VALIDATED detection after 100ms
[ADJUST] Moving to position: 5000
[START/STOP] DC motor: RUNNING
```

### Baud Rate
```
Serial: 115200 (USB debug)
Serial2: 9600 (UART camera communicatie)
```

## Probleemoplossing

### Touch Reageert Niet
- Controleer of `ENABLE_TOUCH` op 1 staat
- Verifieer touch kalibratie waarden (TS_MINX, TS_MAXX, etc.)
- Verhoog `TOUCH_DEBOUNCE_MS` als te gevoelig

### Camera Communiceert Niet
- Verifieer dat camera IP adres overeenkomt met `CAMERA_IP`
- Zorg dat beide apparaten op hetzelfde WiFi netwerk zijn
- Controleer UART bedrading: Camera GPIO6 → Display GPIO16
- Browser moet open zijn op camera webpagina
- Controleer Serial2 output: `[UART] Serial2 ready: YES`

### IR Sensor Altijd Getriggerd
- Toggle `IR_ACTIVE_LOW` tussen true/false
- Huidige instelling: `true` (LOW = gedetecteerd)
- Pas `IR_VALID_TIME_MS` aan voor debounce

### WiFi Verbinding Mislukt
- Verifieer SSID en wachtwoord
- Controleer router instellingen (2.4GHz vereist)
- Zorg voor goed signaalsterkte
- Verhoog aantal verbindingspogingen in setup()

### Stappenmotor Beweegt Niet
- Controleer enable pin (moet LOW zijn wanneer actief)
- Verifieer voeding naar stappenmotor driver
- Pas `stepperMaxSpeed` en `stepperAccel` aan
- Monitor Serial: `[ADJUST] Moving to position: X`

### API Update Niet
- Controleer WiFi verbindingsstatus in debug scherm
- Verifieer dat `API_BASE_URL` correct is
- Zorg dat sessie gestart is (`currentSessionId > 0`)
- Controleer server logs voor fouten

## Geavanceerde Configuratie

### Motor Snelheid Tuning
```cpp
// Stappenmotor
stepperMaxSpeed = 3000.0f;  // Verhoog voor snellere beweging
stepperAccel = 1000.0f;     // Verhoog voor snellere acceleratie

// DC motor
motorPwm = 100;             // Bereik: 0-255 (huidig: 39%)
```

### Positie Presets
```cpp
// Pas aan op basis van fysieke opstelling
PRESET_VOLLEYBALL = 4500;  // Stappen vanaf home
PRESET_SOCCER = 5000;
PRESET_BASKETBALL = 9000;  // Maximale positie
```

### Bal Detectie Parameters
```cpp
BALL_DEBOUNCE_MS = 2000;   // Verhoog voor stabielere detectie
                           // Verlaag voor snellere respons
```

## Veiligheidsvoorzieningen

1. **IR Auto-Stop**: DC motor stopt onmiddellijk wanneer IR sensor getriggerd wordt
2. **Stappenmotor Limieten**: Software voorkomt beweging buiten 0-9000 bereik
3. **Touch Debounce**: Voorkomt onbedoelde meerdere knopdrukken
4. **UART Validatie**: Verwerkt alleen geldige bal codes (0-3)
5. **API Foutafhandeling**: Rapporteert commando fouten naar server

## Project Structuur

```
esphome/
├── platformio.ini          # PlatformIO configuratie
├── README.md               # Dit bestand
├── src/
│   └── main.cpp           # Hoofd applicatie code
├── include/
│   └── README             # Include directory (ongebruikt)
├── lib/
│   └── README             # Libraries directory (ongebruikt)
└── test/
    └── README             # Test directory (ongebruikt)
```

## Versie Geschiedenis

- **v1.0** - Initiële release met basis bal detectie
- **v1.1** - API integratie en WiFi toegevoegd
- **v1.2** - Verbeterde UART afhandeling en auto-trigger
- **v1.3** - Bal telling synchronisatie gefixed
- **v1.4** - IR sensor configuratie verbeteringen
- **Huidig** - Code opschoning en documentatie

## Licentie

Dit project is ontwikkeld voor educatieve en demonstratie doeleinden.

## Auteurs

- Bal detectie systeem ontwikkeling
- Integratie met camera module
- API backend communicatie

## Gerelateerde Projecten

- **Camera Module**: XIAO ESP32-S3 Sense met TensorFlow.js bal detectie
- **Backend API**: Sessie management en data aggregatie server

---

**Opmerking**: Dit systeem vereist dat de camera module actief is en toegankelijk op het netwerk voor volledige functionaliteit. Het browser-gebaseerde AI model moet geladen zijn voor bal detectie.
