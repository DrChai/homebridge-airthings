interface DeviceInfo {
  sn: string;
  displayName: string;
  id: string;
}
interface BleConfig {
  scanTime: number;
  refreshTime: number;
  retryAfter: number;
}
