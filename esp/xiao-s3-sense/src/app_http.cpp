#include "app_http.h"
#include "esp_http_server.h"
#include "esp_timer.h"
#include "esp_camera.h"
#include "img_converters.h"
#include "camera_index.h"
#include "Arduino.h"
#include "tm_model_files.h"

// External variable from main.cpp to track last ball detection
extern volatile int lastBallDetected;

// Global flag to trigger analysis from web interface
volatile bool triggerAnalysis = false;

typedef struct
{
    size_t size;  // number of values used for filtering
    size_t index; // current value index
    size_t count; // value count
    int sum;
    int *values; // array to be filled with values
} ra_filter_t;

static ra_filter_t ra_filter;
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

static void ra_filter_init(ra_filter_t *filter, size_t sample_size)
{
    memset(filter, 0, sizeof(ra_filter_t));
    filter->values = (int *)malloc(sample_size * sizeof(int));
    if (!filter->values)
    {
        return;
    }
    memset(filter->values, 0, sample_size * sizeof(int));
    filter->size = sample_size;
}

// Ball detection codes - must match display board
#define BALL_NONE 0
#define BALL_SOCCER 1
#define BALL_VOLLEYBALL 2
#define BALL_BASKETBALL 3

static esp_err_t analyze_handler(httpd_req_t *req)
{
    char buf[200];
    int len = httpd_req_recv(req, buf, sizeof(buf) - 1);
    if (len <= 0)
        return ESP_FAIL;
    buf[len] = 0;

    Serial.print("[HTTP /analyze] ");
    Serial.println(buf);

    // Simple label extract (works with your JSON format)
    char *p = strstr(buf, "\"prediction\"");
    if (p)
    {
        p = strchr(p, ':');
        if (p)
        {
            p++;
            while (*p == ' ' || *p == '\"')
                p++;
            char label[32];
            int i = 0;
            while (*p && *p != '\"' && i < 31)
            {
                label[i++] = *p++;
            }
            label[i] = 0;

            Serial.print("AI Prediction: ");
            Serial.println(label);

            // Convert label to ball type code
            int ballCode = BALL_NONE;
            
            // Case-insensitive matching for ball types
            String labelStr = String(label);
            labelStr.toLowerCase();
            
            // Filter out baseball/honkbal - we don't use it
            if (labelStr.indexOf("baseball") >= 0 || labelStr.indexOf("honkbal") >= 0) {
                Serial.println("-> Baseball detected but IGNORED (not in system)");
                // Don't update anything, just skip
            }
            else if (labelStr.indexOf("soccer") >= 0 || labelStr.indexOf("football") >= 0 || labelStr.indexOf("voetbal") >= 0) {
                ballCode = BALL_SOCCER;
                Serial.println("-> Soccer Ball Detected (code 1)");
            }
            else if (labelStr.indexOf("volleyball") >= 0 || labelStr.indexOf("volley") >= 0) {
                ballCode = BALL_VOLLEYBALL;
                Serial.println("-> Volleyball Detected (code 2)");
            }
            else if (labelStr.indexOf("basketball") >= 0 || labelStr.indexOf("basket") >= 0) {
                ballCode = BALL_BASKETBALL;
                Serial.println("-> Basketball Detected (code 3)");
            }
            else {
                ballCode = BALL_NONE;
                Serial.println("-> No Ball / Unknown");
            }

            // Send ball code via UART to display board (skip if baseball)
            if (!(labelStr.indexOf("baseball") >= 0 || labelStr.indexOf("honkbal") >= 0)) {
                Comm.Transmit(ballCode);
                Serial.printf("[UART] Sent code %d to display\n", ballCode);
                
                // Store last detected value for continuous retransmission
                lastBallDetected = ballCode;
                Serial.println("[INFO] Last ball code updated - will keep retransmitting");
            }
        }
    }

    httpd_resp_send(req, "OK", HTTPD_RESP_USE_STRLEN);
    return ESP_OK;
}

// =============================================================================
// PLACEHOLDER HANDLERS - You need to implement these based on ESP32-Camera examples
// =============================================================================

// Serves the main HTML page
static esp_err_t index_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "text/html");
    httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
    return httpd_resp_send(req, (const char *)index_ov2640_html_gz, index_ov2640_html_gz_len);
}

// Status endpoint (returns camera settings as JSON)
static esp_err_t status_handler(httpd_req_t *req)
{
    static char json_response[1024];
    sensor_t *s = esp_camera_sensor_get();
    char *p = json_response;
    *p++ = '{';

    p += sprintf(p, "\"framesize\":%u,", s->status.framesize);
    p += sprintf(p, "\"quality\":%u,", s->status.quality);
    p += sprintf(p, "\"brightness\":%d,", s->status.brightness);
    p += sprintf(p, "\"contrast\":%d,", s->status.contrast);
    p += sprintf(p, "\"saturation\":%d,", s->status.saturation);
    p += sprintf(p, "\"sharpness\":%d,", s->status.sharpness);
    p += sprintf(p, "\"special_effect\":%u,", s->status.special_effect);
    p += sprintf(p, "\"wb_mode\":%u,", s->status.wb_mode);
    p += sprintf(p, "\"awb\":%u,", s->status.awb);
    p += sprintf(p, "\"awb_gain\":%u,", s->status.awb_gain);
    p += sprintf(p, "\"aec\":%u,", s->status.aec);
    p += sprintf(p, "\"aec2\":%u,", s->status.aec2);
    p += sprintf(p, "\"ae_level\":%d,", s->status.ae_level);
    p += sprintf(p, "\"aec_value\":%u,", s->status.aec_value);
    p += sprintf(p, "\"agc\":%u,", s->status.agc);
    p += sprintf(p, "\"agc_gain\":%u,", s->status.agc_gain);
    p += sprintf(p, "\"gainceiling\":%u,", s->status.gainceiling);
    p += sprintf(p, "\"bpc\":%u,", s->status.bpc);
    p += sprintf(p, "\"wpc\":%u,", s->status.wpc);
    p += sprintf(p, "\"raw_gma\":%u,", s->status.raw_gma);
    p += sprintf(p, "\"lenc\":%u,", s->status.lenc);
    p += sprintf(p, "\"vflip\":%u,", s->status.vflip);
    p += sprintf(p, "\"hmirror\":%u,", s->status.hmirror);
    p += sprintf(p, "\"dcw\":%u,", s->status.dcw);
    p += sprintf(p, "\"colorbar\":%u", s->status.colorbar);

    *p++ = '}';
    *p++ = 0;

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, json_response, strlen(json_response));
}

// Control endpoint (change camera settings)
static esp_err_t cmd_handler(httpd_req_t *req)
{
    char *buf;
    size_t buf_len;
    char variable[32] = {
        0,
    };
    char value[32] = {
        0,
    };

    buf_len = httpd_req_get_url_query_len(req) + 1;
    if (buf_len > 1)
    {
        buf = (char *)malloc(buf_len);
        if (!buf)
        {
            httpd_resp_send_500(req);
            return ESP_FAIL;
        }
        if (httpd_req_get_url_query_str(req, buf, buf_len) == ESP_OK)
        {
            if (httpd_query_key_value(buf, "var", variable, sizeof(variable)) == ESP_OK &&
                httpd_query_key_value(buf, "val", value, sizeof(value)) == ESP_OK)
            {
            }
            else
            {
                free(buf);
                httpd_resp_send_404(req);
                return ESP_FAIL;
            }
        }
        else
        {
            free(buf);
            httpd_resp_send_404(req);
            return ESP_FAIL;
        }
        free(buf);
    }
    else
    {
        httpd_resp_send_404(req);
        return ESP_FAIL;
    }

    int val = atoi(value);
    sensor_t *s = esp_camera_sensor_get();
    int res = 0;

    if (!strcmp(variable, "framesize"))
    {
        if (s->pixformat == PIXFORMAT_JPEG)
            res = s->set_framesize(s, (framesize_t)val);
    }
    else if (!strcmp(variable, "quality"))
        res = s->set_quality(s, val);
    else if (!strcmp(variable, "contrast"))
        res = s->set_contrast(s, val);
    else if (!strcmp(variable, "brightness"))
        res = s->set_brightness(s, val);
    else if (!strcmp(variable, "saturation"))
        res = s->set_saturation(s, val);
    else if (!strcmp(variable, "gainceiling"))
        res = s->set_gainceiling(s, (gainceiling_t)val);
    else if (!strcmp(variable, "colorbar"))
        res = s->set_colorbar(s, val);
    else if (!strcmp(variable, "awb"))
        res = s->set_whitebal(s, val);
    else if (!strcmp(variable, "agc"))
        res = s->set_gain_ctrl(s, val);
    else if (!strcmp(variable, "aec"))
        res = s->set_exposure_ctrl(s, val);
    else if (!strcmp(variable, "hmirror"))
        res = s->set_hmirror(s, val);
    else if (!strcmp(variable, "vflip"))
        res = s->set_vflip(s, val);
    else if (!strcmp(variable, "awb_gain"))
        res = s->set_awb_gain(s, val);
    else if (!strcmp(variable, "agc_gain"))
        res = s->set_agc_gain(s, val);
    else if (!strcmp(variable, "aec_value"))
        res = s->set_aec_value(s, val);
    else if (!strcmp(variable, "aec2"))
        res = s->set_aec2(s, val);
    else if (!strcmp(variable, "dcw"))
        res = s->set_dcw(s, val);
    else if (!strcmp(variable, "bpc"))
        res = s->set_bpc(s, val);
    else if (!strcmp(variable, "wpc"))
        res = s->set_wpc(s, val);
    else if (!strcmp(variable, "raw_gma"))
        res = s->set_raw_gma(s, val);
    else if (!strcmp(variable, "lenc"))
        res = s->set_lenc(s, val);
    else if (!strcmp(variable, "special_effect"))
        res = s->set_special_effect(s, val);
    else if (!strcmp(variable, "wb_mode"))
        res = s->set_wb_mode(s, val);
    else if (!strcmp(variable, "ae_level"))
        res = s->set_ae_level(s, val);
    else
    {
        res = -1;
    }

    if (res)
    {
        return httpd_resp_send_500(req);
    }

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, NULL, 0);
}

// Capture endpoint (single image)
static esp_err_t capture_handler(httpd_req_t *req)
{
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;

    fb = esp_camera_fb_get();
    if (!fb)
    {
        Serial.println("Camera capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// Stream endpoint (MJPEG)
static esp_err_t stream_handler(httpd_req_t *req)
{
    camera_fb_t *fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t *_jpg_buf = NULL;
    char *part_buf[64];

    res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
    if (res != ESP_OK)
    {
        return res;
    }

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    while (true)
    {
        fb = esp_camera_fb_get();
        if (!fb)
        {
            Serial.println("Camera capture failed");
            res = ESP_FAIL;
        }
        else
        {
            if (fb->format != PIXFORMAT_JPEG)
            {
                bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
                esp_camera_fb_return(fb);
                fb = NULL;
                if (!jpeg_converted)
                {
                    Serial.println("JPEG compression failed");
                    res = ESP_FAIL;
                }
            }
            else
            {
                _jpg_buf_len = fb->len;
                _jpg_buf = fb->buf;
            }
        }
        if (res == ESP_OK)
        {
            size_t hlen = snprintf((char *)part_buf, 64, "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", _jpg_buf_len);
            res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
        }
        if (res == ESP_OK)
        {
            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        if (res == ESP_OK)
        {
            res = httpd_resp_send_chunk(req, "\r\n--frame\r\n", 12);
        }
        if (fb)
        {
            esp_camera_fb_return(fb);
            fb = NULL;
            _jpg_buf = NULL;
        }
        else if (_jpg_buf)
        {
            free(_jpg_buf);
            _jpg_buf = NULL;
        }
        if (res != ESP_OK)
        {
            break;
        }
    }
    return res;
}

// =============================================================================
// TEACHABLE MACHINE MODEL FILE HANDLERS
// =============================================================================

static esp_err_t tm_model_json_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Cache-Control", "public, max-age=86400"); // Cache for 24h
    return httpd_resp_send(req, (const char *)tm_model_json, (ssize_t)tm_model_json_len);
}

static esp_err_t tm_metadata_json_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Cache-Control", "public, max-age=86400"); // Cache for 24h
    return httpd_resp_send(req, (const char *)tm_metadata_json, (ssize_t)tm_metadata_json_len);
}

static esp_err_t tm_weights_bin_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "application/octet-stream");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Cache-Control", "public, max-age=31536000, immutable");
    return httpd_resp_send(req, (const char *)tm_weights_bin, (ssize_t)tm_weights_bin_len);
}

// Placeholder handlers for other endpoints (implement as needed)
static esp_err_t bmp_handler(httpd_req_t *req)
{
    return httpd_resp_send(req, "BMP not implemented", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t xclk_handler(httpd_req_t *req)
{
    return httpd_resp_send(req, "XCLK not implemented", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t reg_handler(httpd_req_t *req)
{
    return httpd_resp_send(req, "REG not implemented", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t greg_handler(httpd_req_t *req)
{
    return httpd_resp_send(req, "GREG not implemented", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t pll_handler(httpd_req_t *req)
{
    return httpd_resp_send(req, "PLL not implemented", HTTPD_RESP_USE_STRLEN);
}

static esp_err_t win_handler(httpd_req_t *req)
{
    return httpd_resp_send(req, "WIN not implemented", HTTPD_RESP_USE_STRLEN);
}

// NEW: Trigger endpoint - sets flag to request browser to analyze
static esp_err_t trigger_handler(httpd_req_t *req)
{
    triggerAnalysis = true;
    Serial.println("[TRIGGER] Analysis requested by display");
    
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, "{\"status\":\"triggered\"}", HTTPD_RESP_USE_STRLEN);
}

// NEW: Check trigger endpoint - browser polls this to see if analysis needed
static esp_err_t check_trigger_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    
    if (triggerAnalysis) {
        // Reset flag and tell browser to analyze
        triggerAnalysis = false;
        return httpd_resp_send(req, "{\"trigger\":true}", HTTPD_RESP_USE_STRLEN);
    } else {
        return httpd_resp_send(req, "{\"trigger\":false}", HTTPD_RESP_USE_STRLEN);
    }
}

// =============================================================================
// START CAMERA SERVER - Main function that registers all endpoints
// =============================================================================

void startCameraServer()
{
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 16;

    httpd_uri_t index_uri = {
        .uri = "/",
        .method = HTTP_GET,
        .handler = index_handler,
        .user_ctx = NULL};

    httpd_uri_t status_uri = {
        .uri = "/status",
        .method = HTTP_GET,
        .handler = status_handler,
        .user_ctx = NULL};

    httpd_uri_t cmd_uri = {
        .uri = "/control",
        .method = HTTP_GET,
        .handler = cmd_handler,
        .user_ctx = NULL};

    httpd_uri_t capture_uri = {
        .uri = "/capture",
        .method = HTTP_GET,
        .handler = capture_handler,
        .user_ctx = NULL};

    httpd_uri_t stream_uri = {
        .uri = "/stream",
        .method = HTTP_GET,
        .handler = stream_handler,
        .user_ctx = NULL};

    // YOUR CUSTOM ANALYZE ENDPOINT (POST)
    httpd_uri_t analyze_uri = {
        .uri = "/analyze",
        .method = HTTP_POST,
        .handler = analyze_handler,
        .user_ctx = NULL};

    // Teachable Machine embedded model files
    httpd_uri_t tm_model_uri = {
        .uri = "/my_model/model.json",
        .method = HTTP_GET,
        .handler = tm_model_json_handler,
        .user_ctx = NULL};

    httpd_uri_t tm_metadata_uri = {
        .uri = "/my_model/metadata.json",
        .method = HTTP_GET,
        .handler = tm_metadata_json_handler,
        .user_ctx = NULL};

    httpd_uri_t tm_weights_uri = {
        .uri = "/my_model/weights.bin",
        .method = HTTP_GET,
        .handler = tm_weights_bin_handler,
        .user_ctx = NULL};

    httpd_uri_t bmp_uri = {
        .uri = "/bmp",
        .method = HTTP_GET,
        .handler = bmp_handler,
        .user_ctx = NULL};

    httpd_uri_t xclk_uri = {
        .uri = "/xclk",
        .method = HTTP_GET,
        .handler = xclk_handler,
        .user_ctx = NULL};

    httpd_uri_t reg_uri = {
        .uri = "/reg",
        .method = HTTP_GET,
        .handler = reg_handler,
        .user_ctx = NULL};

    httpd_uri_t greg_uri = {
        .uri = "/greg",
        .method = HTTP_GET,
        .handler = greg_handler,
        .user_ctx = NULL};

    httpd_uri_t pll_uri = {
        .uri = "/pll",
        .method = HTTP_GET,
        .handler = pll_handler,
        .user_ctx = NULL};

    httpd_uri_t win_uri = {
        .uri = "/resolution",
        .method = HTTP_GET,
        .handler = win_handler,
        .user_ctx = NULL};

    // NEW: Trigger analysis endpoint
    httpd_uri_t trigger_uri = {
        .uri = "/trigger",
        .method = HTTP_GET,
        .handler = trigger_handler,
        .user_ctx = NULL};

    // NEW: Check trigger status endpoint
    httpd_uri_t check_trigger_uri = {
        .uri = "/check_trigger",
        .method = HTTP_GET,
        .handler = check_trigger_handler,
        .user_ctx = NULL};

    ra_filter_init(&ra_filter, 20);

    log_i("Starting web server on port: '%d'", config.server_port);
    if (httpd_start(&camera_httpd, &config) == ESP_OK)
    {
        httpd_register_uri_handler(camera_httpd, &index_uri);
        httpd_register_uri_handler(camera_httpd, &cmd_uri);
        httpd_register_uri_handler(camera_httpd, &status_uri);
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &analyze_uri);
        httpd_register_uri_handler(camera_httpd, &bmp_uri);

        httpd_register_uri_handler(camera_httpd, &xclk_uri);
        httpd_register_uri_handler(camera_httpd, &reg_uri);
        httpd_register_uri_handler(camera_httpd, &greg_uri);
        httpd_register_uri_handler(camera_httpd, &pll_uri);
        httpd_register_uri_handler(camera_httpd, &win_uri);

        httpd_register_uri_handler(camera_httpd, &trigger_uri);
        httpd_register_uri_handler(camera_httpd, &check_trigger_uri);

        httpd_register_uri_handler(camera_httpd, &tm_model_uri);
        httpd_register_uri_handler(camera_httpd, &tm_metadata_uri);
        httpd_register_uri_handler(camera_httpd, &tm_weights_uri);
    }

    config.server_port += 1;
    config.ctrl_port += 1;
    log_i("Starting stream server on port: '%d'", config.server_port);
    if (httpd_start(&stream_httpd, &config) == ESP_OK)
    {
        httpd_register_uri_handler(stream_httpd, &stream_uri);
    }
}

// Optional LED flash setup
void setupLedFlash()
{
    // Implement if needed for your board
    log_i("LED Flash setup called");
}
