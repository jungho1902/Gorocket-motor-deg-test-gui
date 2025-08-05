export interface ValveMappingEntry {
  servoIndex: number;
}

export interface AppConfig {
  serial: {
    baudRate: number;
  };
  valveMappings: Record<string, ValveMappingEntry>;
}
