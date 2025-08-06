// src/components/dashboard/MotorControlPanel.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

// 설정 파일에서 읽어온 모터 매핑 정보의 타입
interface MotorMapping {
  [motorName: string]: {
    servoIndex: number;
  };
}

interface MotorControlPanelProps {
  motorMappings: MotorMapping;
}

const MotorControlPanel: React.FC<MotorControlPanelProps> = ({ motorMappings }) => {
  // 각 모터의 현재 각도를 저장하는 상태
  const [angles, setAngles] = useState<{ [key: string]: number }>({});

  // 컴포넌트가 처음 로드될 때 모든 모터의 각도를 90도로 초기화
  useEffect(() => {
    const initialAngles: { [key: string]: number } = {};
    Object.keys(motorMappings).forEach(name => {
      initialAngles[name] = 90;
    });
    setAngles(initialAngles);
  }, [motorMappings]);

  // 각도 변경 핸들러
  const handleAngleChange = (name: string, newAngle: number) => {
    // 0~180 범위를 벗어나지 않도록 클램핑
    const clampedAngle = Math.max(0, Math.min(180, newAngle));
    
    setAngles(prev => ({ ...prev, [name]: clampedAngle }));

    // 시리얼 명령 전송
    const servoIndex = motorMappings[name].servoIndex;
    const command = `M,${servoIndex},${clampedAngle}`;
    
    // preload.js를 통해 노출된 API 사용
    if (window.electronAPI) {
      window.electronAPI.sendToSerial(command);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motor Control</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {Object.entries(motorMappings).map(([name, { servoIndex }]) => (
          <div key={name} className="space-y-2">
            <label className="font-medium">{name} (Index: {servoIndex})</label>
            <div className="flex items-center gap-4">
              <Slider
                min={0}
                max={180}
                step={1}
                value={[angles[name] || 0]}
                onValueChange={(value) => handleAngleChange(name, value[0])}
              />
              <Input
                type="number"
                min={0}
                max={180}
                value={angles[name] || 0}
                onChange={(e) => handleAngleChange(name, parseInt(e.target.value, 10))}
                className="w-20"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MotorControlPanel;MotorControlPanel.tsx
