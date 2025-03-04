import noble, { Peripheral } from '@abandonware/noble';
import { Logging } from 'homebridge';
import {
  parseSerial,
  parseWave2Rawdata,
  WAVE2_CURR_VAL_UUID,
} from './parser.js';

// Utility function to simulate sleep
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
export default class {
  log: Logging;
  curState: string = 'unknown';
  isScanning: boolean = false;
  discoveredDeivces: Map<string, DeviceInfo> = new Map();
  discoveredPeripherals: Map<string, Peripheral> = new Map();
  lastData: Map<string, WAVE2> = new Map();
  stopRunner: boolean = false;
  config: BleConfig;
  constructor(bleConfig: BleConfig, log: Logging) {
    this.log = log;
    // Configs
    this.config = {
      ...bleConfig,
      scanTime: bleConfig.scanTime < 10 * 1000 ? 10 * 1000 : bleConfig.scanTime,
      refreshTime:
        bleConfig.refreshTime < 5 * 60 * 1000
          ? 5 * 60 * 1000
          : bleConfig.refreshTime,
    };
    // Can only scan/connect/send if the noble stateChange is 'poweredOn'
    noble.on('scanStart', () => {
      this.log.debug('[BLE] starting the discover.');
    });
    noble.on('scanStop', () => {
      this.log.debug('[BLE] stopped the discover.');
      // if (this.isScanning) {
      // this.log.debug(`retry in ${this.config.restartDelay}s`);
      // setTimeout(() => {
      //   this.log.debug(`[BLE] Restarting scan.`);
      //   this.startScanning();
      // }, this.platform.config.retryAfter * 1000);
      // }
    });

    noble.on('stateChange', (state: string) => {
      this.curState = state;
      if (state === 'poweredOn') {
        this.log.debug('[BLE] Adapter is powered on.');
      } else {
        this.log.error('[BLE] %s.', state);
        noble.stopScanning();
      }
    });
    noble.on('discover', this.sensorStartDiscovery);
  }

  startScanning = () => {
    this.isScanning = true;
    noble.startScanning([], true);
  };

  getValidatedDevices = async () => {
    if (this.curState !== 'poweredOn') {
      this.log.debug(
        '[BLE] Adapter is not powered on. Waiting for state to change...',
      );
      await new Promise((resolve) => {
        const checkState = () => {
          if (this.curState === 'poweredOn') {
            resolve(null);
          } else {
            setTimeout(checkState, this.config.retryAfter);
          }
        };
        checkState();
      });
    }
    this.startScanning();
    await new Promise((resolve) => {
      setTimeout(() => {
        noble.stopScanning();
        this.isScanning = false;
        this.log.debug(
          `[BLE] Scan complete. after scanTime: ${this.config.scanTime / 1000}s`,
        );
        resolve(null);
      }, this.config.scanTime);
    });
    if (this.discoveredDeivces.size === 0) {
      this.log.error(
        `[BLE] No devices found. Retrying after${this.config.retryAfter / 1000}`,
      );
      setTimeout(this.getValidatedDevices, this.config.retryAfter);
    }
    return this.discoveredDeivces;
  };

  sensorStartDiscovery = (peripheral: Peripheral) => {
    const {
      advertisement: { manufacturerData, localName } = {},
      id,
      address,
    } = peripheral;
    const sn = manufacturerData && parseSerial(manufacturerData);

    if (sn) {
      this.discoveredPeripherals.set(sn.toString(), peripheral);
      this.discoveredDeivces.set(sn.toString(), {
        sn: sn.toString(),
        id: address || id,
        displayName: localName || 'Default',
      });
    }
  };
  startRunner = async () => {
    // Check if the stop flag is set
    if (this.stopRunner) {
      this.log.debug('[BLE] Runner stopped.');
      return;
    }

    for (const [sn, device] of this.discoveredDeivces) {
      try {
        // Wait for either getData to complete or timeout after 5 seconds
        await Promise.race([
          sleep(this.config.scanTime),
          this.getData(device), // Fetch data
        ]);
      } catch (error) {
        this.log.error(
          `[BLE] Error getting data for ${sn}. current timeout in ${this.config.scanTime}:`,
          error,
        );
      }
    }

    await sleep(this.config.refreshTime);
    this.log.debug(
      `[BLE] Runner will in ${this.config.refreshTime / 1000 / 60}mins. `,
    );
    this.startRunner();
  };

  getData = async (device: DeviceInfo): Promise<WAVE2> => {
    const peripheral = this.discoveredPeripherals.get(device.sn);
    if (!peripheral) {
      this.log.error(`[BLE] Peripheral not found for device ${device.sn}`);
      throw new Error(`Peripheral not found for device ${device.sn}`);
    }
    if (peripheral.state !== 'disconnected') {
      this.log.warn(`Peripheral state is "${peripheral.state}".`);
      switch (peripheral.state) {
      case 'connecting':
        // consider awaitable lock here
        //peripheral.cancelConnect();
        throw new Error('other accessories is requsted to connect already');
      case 'connected':
        return this.lastData.get(device.sn)!;
      case 'error':
        this.log.error(
          `[BLE] Peripheral ${device.sn} has an error state. Refreshing devices.`,
        );
        this.clear();
        await this.getValidatedDevices();
        break;
      }
    }
    // consider add awaitable lock here
    await peripheral.connectAsync();
    const char = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [],
      [WAVE2_CURR_VAL_UUID],
    );
    const buf = await char.characteristics[0].readAsync();
    await this.disconnect(peripheral);
    const data = parseWave2Rawdata(buf);
    this.lastData.set(device.sn, data);
    this.log.debug(`[BLE] received ${device.sn} Data:`, data);
    return this.lastData.get(device.sn)!;
  };

  disconnect = async (peripheral: Peripheral) => {
    noble.stopScanning();
    await Promise.race([sleep(1000 * 5), peripheral.disconnectAsync()]);
  };
  // Method to stop the runner
  stop = () => {
    this.stopRunner = true;
    this.log.debug(
      '[BLE] Stop flag set. Runner will stop after current iteration.',
    );
  };

  clear = () => {
    this.stop();
    this.discoveredDeivces.clear();
    this.discoveredPeripherals.clear();
    this.lastData.clear();
    this.isScanning = false;
  };
}
