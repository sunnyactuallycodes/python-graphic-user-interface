

#include <Arduino.h>

// Example: Simulating or reading coordinates from sensors
float x = 0.0;
float y = 0.0;
float z = 0.0;
float roll = 0.0;
float pitch = 0.0;
float yaw = 0.0;

unsigned long lastSendTime = 0;
const int sendIntervalMs = 20; // 50 Hz update rate

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000) {
    // Wait for serial port to connect on native USB boards
  }
  
  // Initialize your sensors here (e.g., MPU6050, BNO055, GPS, Ultra-wideband)
}

void loop() {
  unsigned long now = millis();
  
  if (now - lastSendTime >= sendIntervalMs) {
    lastSendTime = now;
    
    // --- REPLACE THIS WITH YOUR REAL SENSOR READINGS ---
    float t = now / 1000.0;
    x = 20.0 * cos(0.5 * t);
    z = 20.0 * sin(0.5 * t);
    y = 10.0 + 5.0 * sin(t);
    roll = 15.0 * sin(0.5 * t);
    pitch = 5.0 * cos(t);
    yaw = (t * 20.0);
    // ---------------------------------------------------
    
    // Format as clean JSON packet for the Python backend
    Serial.print("{\"x\":");
    Serial.print(x, 3);
    Serial.print(",\"y\":");
    Serial.print(y, 3);
    Serial.print(",\"z\":");
    Serial.print(z, 3);
    Serial.print(",\"roll\":");
    Serial.print(roll, 2);
    Serial.print(",\"pitch\":");
    Serial.print(pitch, 2);
    Serial.print(",\"yaw\":");
    Serial.print(yaw, 2);
    Serial.println("}");
  }
}
