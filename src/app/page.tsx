'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/dashboard/header';
import SensorPanel from '@/components/dashboard/sensor-panel';
import MotorControlPanel from '@/components/dashboard/motor-control-panel';
import SequencePanel from '@/components/dashboard/sequence-panel';
import DataChartPanel from '@/components/dashboard/data-chart-panel';
import TerminalPanel from '@/components/dashboard/terminal-panel';
import { useToast } from "@/hooks/use-toast";
import type { AppConfig } from '@/types';

// --- 데이터 타입 정의 ---
export interface SensorData {
  pt1: number;
  pt2: number;
  pt3: number;
  pt4: number;
  flow1: number;
  flow2: number;
  tc1: number;
  timestamp: number;
}

export interface MotorData {
  name: string;
  angle: number;
}

// --- 상수 정의 ---
const MAX_CHART_DATA_POINTS = 100;
const PRESSURE_LIMIT = 850; // PSI

export default function Home() {
  const { toast } = useToast();

  // --- 상태 관리 (State) ---
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [chartData, setChartData] = useState<SensorData[]>([]);
  const [motors, setMotors] = useState<MotorData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [serialPorts, setSerialPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [isLogging, setIsLogging] = useState(false);
  const [sequenceLogs, setSequenceLogs] = useState<string[]>(['System standby. Select a sequence to begin.']);
  const [activeSequence, setActiveSequence] = useState<string | null>(null);

  // --- Ref 관리 ---
  const sequenceTimeoutRef = useRef<NodeJS.Timeout[]>([]);
  const emergencyShutdownTriggered = useRef(false);

  // --- 이펙트 (Effects) ---

  // Zoom 컨트롤 이펙트
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        window.electronAPI[event.deltaY < 0 ? 'zoomIn' : 'zoomOut']();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        if (event.key === '=') window.electronAPI.zoomIn();
        else if (event.key === '-') window.electronAPI.zoomOut();
        else if (event.key === '0') window.electronAPI.zoomReset();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 초기 설정 및 시리얼 통신 이펙트
  useEffect(() => {
    const initializeApp = async () => {
      // 1. 시리얼 포트 목록 가져오기
      const ports = await window.electronAPI.getSerialPorts();
      setSerialPorts(ports);
      if (ports.length > 0) setSelectedPort(ports[0]);

      // 2. 설정 파일 로드 및 모터 상태 초기화
      const cfg = await window.electronAPI.getConfig();
      setAppConfig(cfg);
      if (cfg?.motorMappings) {
        const initialMotors = Object.keys(cfg.motorMappings).map(name => ({
          name,
          angle: 90, // 모든 모터의 초기 각도를 90도로 설정
        }));
        setMotors(initialMotors);
      }
    };
    initializeApp();

    // 3. 시리얼 데이터 수신 처리
    const handleSerialData = (data: string) => {
      addLog(`Received: ${data}`);
      const newData: Partial<SensorData> = {};
      data.split(',').forEach(part => {
        const [key, rawValue] = part.split(':');
        if (key && rawValue) {
          if (key in (sensorData || {})) {
             (newData as any)[key] = parseFloat(rawValue);
          }
        }
      });

      if (Object.keys(newData).length > 0) {
        const updatedData = { ...sensorData, ...newData, timestamp: Date.now() } as SensorData;
        setSensorData(updatedData);
        setChartData(prev => [...prev.slice(-MAX_CHART_DATA_POINTS + 1), updatedData]);
        
        // 압력 임계값 초과 시 비상 정지 시퀀스 자동 실행
        if ((updatedData.pt1 > PRESSURE_LIMIT || updatedData.pt2 > PRESSURE_LIMIT) && !emergencyShutdownTriggered.current) {
          addLog(`!!! CRITICAL PRESSURE DETECTED (PT1: ${updatedData.pt1.toFixed(0)}, PT2: ${updatedData.pt2.toFixed(0)}) !!!`);
          handleSequence("Emergency Shutdown");
          emergencyShutdownTriggered.current = true;
        } else if (updatedData.pt1 < PRESSURE_LIMIT && updatedData.pt2 < PRESSURE_LIMIT) {
          emergencyShutdownTriggered.current = false;
        }
      }
    };

    // 4. 시리얼 에러 처리
    const handleSerialError = (error: string) => {
      addLog(`SERIAL ERROR: ${error}`);
      toast({ title: "Serial Port Error", description: error, variant: "destructive" });
      setConnectionStatus('disconnected');
    };

    const cleanupSerialData = window.electronAPI.onSerialData(handleSerialData);
    const cleanupSerialError = window.electronAPI.onSerialError(handleSerialError);

    // 5. 컴포넌트 언마운트 시 정리
    return () => {
      cleanupSerialData();
      cleanupSerialError();
      sequenceTimeoutRef.current.forEach(clearTimeout);
    };
  }, []); // sensorData 의존성 제거, 초기 1회만 실행되도록 수정

  // 로깅 실패 처리 이펙트
  useEffect(() => {
    const cleanup = window.electronAPI.onLogCreationFailed(() => {
      toast({ title: "Logging Error", description: "Failed to create log file.", variant: "destructive" });
      setIsLogging(false);
    });
    return () => cleanup();
  }, [toast]);


  // --- 핸들러 함수 (Handlers) ---

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-GB');
    setSequenceLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    if (connectionStatus !== 'connected') {
      toast({ title: "Not Connected", description: "Must be connected to a serial port.", variant: "destructive" });
      return;
    }
    window.electronAPI.sendToSerial(cmd);
    addLog(`Sent: ${cmd}`);
  }, [connectionStatus, toast, addLog]);

  const handleConnect = useCallback(async () => {
    if (connectionStatus === 'connected') {
      await window.electronAPI.disconnectSerial();
      setConnectionStatus('disconnected');
      addLog(`Disconnected from ${selectedPort}.`);
    } else {
      if (!selectedPort) {
        toast({ title: "Connection Error", description: "Please select a serial port.", variant: "destructive" });
        return;
      }
      setConnectionStatus('connecting');
      addLog(`Connecting to ${selectedPort}...`);
      const success = await window.electronAPI.connectSerial(selectedPort);
      setConnectionStatus(success ? 'connected' : 'disconnected');
      addLog(`${success ? 'Successfully connected' : 'Failed to connect'} to ${selectedPort}.`);
    }
  }, [connectionStatus, selectedPort, toast, addLog]);

  const handleMotorAngleChange = useCallback((motorName: string, angle: number) => {
    const mapping = appConfig?.motorMappings?.[motorName];
    if (!mapping) return;

    const command = `M,${mapping.servoIndex},${Math.round(angle)}`;
    sendCommand(command);
    setMotors(prev => prev.map(m => m.name === motorName ? { ...m, angle } : m));
  }, [appConfig, sendCommand]);

  const handleLoggingToggle = useCallback(() => {
    window.electronAPI[isLogging ? 'stopLogging' : 'startLogging']();
    setIsLogging(!isLogging);
  }, [isLogging]);

  const clearAndRunSequence = useCallback((name: string, steps: { message: string, delay: number, action?: () => void }[]) => {
    setActiveSequence(name);
    setSequenceLogs([]);
    sequenceTimeoutRef.current.forEach(clearTimeout);
    sequenceTimeoutRef.current = [];
    
    addLog(`Initiating sequence: ${name}`);
    let cumulativeDelay = 0;
    steps.forEach((step, index) => {
      cumulativeDelay += step.delay;
      const timeout = setTimeout(() => {
        addLog(step.message);
        step.action?.();
        if (index === steps.length - 1) {
          addLog(`Sequence ${name} complete.`);
          setActiveSequence(null);
        }
      }, cumulativeDelay);
      sequenceTimeoutRef.current.push(timeout);
    });
  }, [addLog]);

  const handleSequence = useCallback((sequenceName: string) => {
    if (activeSequence) {
      toast({ title: "Sequence in Progress", description: `Cannot start while "${activeSequence}" is running.` });
      return;
    }

    switch (sequenceName) {
      case "Precision Diagnostics": {
        const steps: { message: string, delay: number, action?: () => void }[] = [];
        const NUM_MOTORS = 7;
        steps.push({ message: "🔬 Initiating Precision Diagnostics...", delay: 500 });
        // Stage 1, 2, 3 로직... (이전 답변과 동일)
        clearAndRunSequence("Precision Diagnostics", steps);
        break;
      }
      case "Emergency Shutdown":
        clearAndRunSequence("Emergency Shutdown", [
          { message: "!!! EMERGENCY SHUTDOWN !!!", delay: 100, action: () => sendCommand("SEQ_SHUTDOWN") },
        ]);
        break;
      default:
        addLog(`Sequence "${sequenceName}" is not defined.`);
    }
  }, [activeSequence, toast, clearAndRunSequence, sendCommand, addLog]);

  // --- UI 렌더링 (JSX) ---
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header
        connectionStatus={connectionStatus}
        ports={serialPorts}
        selectedPort={selectedPort}
        onPortChange={setSelectedPort}
        onConnect={handleConnect}
        isLogging={isLogging}
        onToggleLogging={handleLoggingToggle}
      />
      <main className="flex-grow p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          <div className="lg:col-span-12">
            <SensorPanel data={sensorData} />
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 gap-6">
            {motors.length > 0 && (
              <MotorControlPanel 
                motors={motors} 
                onAngleChange={handleMotorAngleChange} 
              />
            )}
            <DataChartPanel data={chartData} />
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 gap-6 auto-rows-min">
            <SequencePanel onSequence={handleSequence} activeSequence={activeSequence} />
            <TerminalPanel logs={sequenceLogs} activeSequence={activeSequence} />
          </div>
        </div>
      </main>
    </div>
  );
}