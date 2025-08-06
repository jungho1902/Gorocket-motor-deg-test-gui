#include <Servo.h>

// 최종 통신용 코드

const int NUM_SERVOS = 7;
const int servoPins[NUM_SERVOS] = {13, 12, 11, 10, 9, 8, 7};
Servo servos[NUM_SERVOS];

void setup() {
  Serial.begin(115200);
  Serial.println("Arduino Mega: Servo Controller Ready.");
  
  for (int i = 0; i < NUM_SERVOS; i++) {
    servos[i].attach(servoPins[i], 500, 2500);
    servos[i].write(90);
    delay(50);
  }
  Serial.println("All servos initialized to 90 degrees. Waiting for commands...");
}

void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.startsWith("M,")) {
      int firstComma = command.indexOf(',');
      int secondComma = command.indexOf(',', firstComma + 1);

      if (secondComma > firstComma) {
        int servoIndex = command.substring(firstComma + 1, secondComma).toInt();
        int angle = command.substring(secondComma + 1).toInt();

        if (servoIndex >= 0 && servoIndex < NUM_SERVOS && angle >= 0 && angle <= 180) {
          servos[servoIndex].write(angle);
          
          Serial.print("OK: Motor index ");
          Serial.print(servoIndex);
          Serial.print(" set to ");
          Serial.print(angle);
          Serial.println(" degrees.");
        }
      }
    }
  }
}