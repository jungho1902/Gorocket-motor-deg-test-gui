// src/components/dashboard/motor-control-panel.tsx

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { MotorData } from '@/app/page'; // page.tsx에서 정의한 타입을 가져옵니다.

interface MotorControlPanelProps {
  motors: MotorData[];
  onAngleChange: (motorName: string, angle: number) => void;
}

const MotorControlPanel: React.FC<MotorControlPanelProps> = ({ motors, onAngleChange }) => {
  const handleInputChange = (name: string, value: string) => {
    // 입력값이 숫자가 아닐 경우를 대비하여 처리
    const angle = parseInt(value, 10);
    if (!isNaN(angle) && angle >= 0 && angle <= 180) {
      onAngleChange(name, angle);
    } else if (value === "") {
      // 입력창을 비웠을 때 처리 (예: 0으로 설정)
      onAngleChange(name, 0);
    }
  };

  // motors prop이 배열이 아닐 경우를 대비한 안전장치
  if (!Array.isArray(motors)) {
    return (
        <Card>
            <CardHeader><CardTitle>Motor Control</CardTitle></CardHeader>
            <CardContent><p>Loading motor data...</p></CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motor Control</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {motors.map((motor) => (
          <div key={motor.name} className="space-y-3">
            <label className="font-medium text-sm">{motor.name}</label>
            <div className="flex items-center gap-4">
              <Slider
                min={0}
                max={180}
                step={1}
                value={[motor.angle]}
                onValueChange={(value) => onAngleChange(motor.name, value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                max={180}
                value={motor.angle}
                onChange={(e) => handleInputChange(motor.name, e.target.value)}
                className="w-20 text-center"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MotorControlPanel;