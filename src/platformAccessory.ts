import { PlatformAccessory, Service } from 'homebridge';

import type AirThingsPlatform from './platform.js';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export default class Wave2Accessory {
  private RadonSvc: Service;
  private TempSvc: Service;
  private HumiditySvc: Service;
  private lastData: WAVE2 | undefined = undefined;
  private readonly device: DeviceInfo;
  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */

  constructor(
    private readonly platform: AirThingsPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.device = accessory.context.device;
    const { displayRadonSTA, displayRadonLTA } = this.platform.config;
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(
        this.platform.Characteristic.Name,
        `${this.device.displayName}`,
      )
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Airthings')
      .setCharacteristic(this.platform.Characteristic.Model, 'Wave 2')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.device.sn,
      );

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory

    this.RadonSvc =
      this.accessory.getService(this.platform.AirthingsService) ||
      this.accessory.addService(this.platform.AirthingsService);
    this.TempSvc =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.HumiditySvc =
      this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.RadonSvc.setCharacteristic(
      this.platform.Characteristic.Name,
      `Airthings Wave ${accessory.context.device.sn}`,
    );
    this.TempSvc.setCharacteristic(
      this.platform.Characteristic.Name,
      `Airthings Temperature ${accessory.context.device.sn}`,
    );
    this.HumiditySvc.setCharacteristic(
      this.platform.Characteristic.Name,
      `Airthings Humidity ${accessory.context.device.sn}`,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.TempSvc.getCharacteristic(
      this.platform.Characteristic.CurrentTemperature,
    ).onGet(this.getAttr('temperature'));

    // register handlers for the Brightness Characteristic
    this.HumiditySvc.getCharacteristic(
      this.platform.Characteristic.CurrentRelativeHumidity,
    ).onGet(this.getAttr('humidity'));
    this.RadonSvc.getCharacteristic(
      this.platform.Characteristic.AirQuality,
    ).onGet(() => {
      this.getAttr('radon_sta');
      return this.calAirQuality(this.lastData);
    });

    if (displayRadonSTA) {
      this.RadonSvc.getCharacteristic(
        this.platform.AirthingsCharacteristic.RadonSta,
      ).onGet(this.getAttr('radon_sta'));
    }
    if (displayRadonLTA) {
      this.RadonSvc.getCharacteristic(
        this.platform.AirthingsCharacteristic.RadonLta,
      ).onGet(this.getAttr('radon_lta'));
    }
    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */

    setInterval(() => {
      const data = this.platform.scanner.lastData.get(this.device.sn);
      const aq = this.calAirQuality(data);
      if (this.lastData?.radon_sta !== data?.radon_sta) {
        this.RadonSvc.updateCharacteristic(
          this.platform.Characteristic.AirQuality,
          aq,
        );
      }
      if (data) {
        const { lastUpdateAt } = data;
        const { displayRadonSTA, displayRadonLTA } = this.platform.config;
        if (displayRadonSTA && this.lastData?.radon_sta !== data.radon_sta) {
          this.RadonSvc.updateCharacteristic(
            this.platform.AirthingsCharacteristic.RadonSta,
            data.radon_sta,
          );
        }
        if (displayRadonLTA && this.lastData?.radon_lta !== data.radon_lta) {
          this.RadonSvc.updateCharacteristic(
            this.platform.AirthingsCharacteristic.RadonLta,
            data.radon_lta,
          );
        }

        this.RadonSvc.updateCharacteristic(
          this.platform.Characteristic.StatusActive,
          Date.now() / 1000 - lastUpdateAt / 1000 < 2 * 3600,
        );
      }
      this.TempSvc.updateCharacteristic(
        this.platform.Characteristic.CurrentTemperature,
        data?.temperature || 0,
      );
      this.HumiditySvc.updateCharacteristic(
        this.platform.Characteristic.CurrentRelativeHumidity,
        data?.humidity || 0,
      );

      this.platform.log.debug('Triggering RadonSvc:', data);
      this.lastData = data;
    }, this.platform.config.refreshTime * 1000);
  }
  calAirQuality = (lastData: WAVE2 | undefined): number => {
    const radon_sta = lastData?.radon_sta;
    let aq = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (!radon_sta) {
      return aq;
    }
    if (radon_sta >= 150) {
      aq = this.platform.Characteristic.AirQuality.POOR;
    } else if (radon_sta >= 100) {
      aq = this.platform.Characteristic.AirQuality.FAIR;
    } else if (radon_sta >= 50) {
      aq = this.platform.Characteristic.AirQuality.GOOD;
    } else {
      aq = this.platform.Characteristic.AirQuality.EXCELLENT;
    }
    return aq;
  };

  getAttr =
    (type: 'radon_lta' | 'radon_sta' | 'temperature' | 'humidity') =>
      async (): Promise<number | null> => {
        if (!this.lastData) {
          try {
          // const data = await this.platform.scanner.getData(this.device);
            this.lastData = this.platform.scanner.lastData.get(this.device.sn);
          } catch (err) {
            return this.lastData?.[`${type}`] || 0;
          }
        }
        return this.lastData?.[`${type}`] || 0;
      };
}
