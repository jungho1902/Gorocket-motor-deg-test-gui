
export {};

declare global {
  interface Window {
    electronAPI: {
      getSerialPorts: () => Promise<string[]>;
      connectSerial: (portName: string) => Promise<boolean>;
      disconnectSerial: () => Promise<boolean>;
      sendToSerial: (data: string) => void;
      onSerialData: (callback: (data: string) => void) => void;
      onSerialError: (callback: (error: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
