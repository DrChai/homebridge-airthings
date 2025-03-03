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
    this.device = accessory.context.device
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Name, `${this.device.displayName}`)
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Airthings')
      .setCharacteristic(this.platform.Characteristic.Model, 'Wave 2')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.sn);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory

    this.RadonSvc = this.accessory.getService(this.platform.AirthingsServices) || this.accessory.addService(this.platform.AirthingsServices);
    // this.RadonSvc.getCharacteristic(this.platform.RadonLtaChar) || this.RadonSvc.addCharacteristic(this.platform.RadonLtaChar);
    // this.RadonSvc.getCharacteristic(this.platform.AirthingsCharacteristics.RadonLta) || this.RadonSvc.addCharacteristic(this.platform.AirthingsCharacteristics.RadonLta);
    // this.RadonSvc.getCharacteristic(this.platform.AirthingsCharacteristics.RadonSta) || this.RadonSvc.addCharacteristic(this.platform.AirthingsCharacteristics.RadonSta);
    this.TempSvc = this.accessory.getService(this.platform.Service.TemperatureSensor) || this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.HumiditySvc = this.accessory.getService(this.platform.Service.HumiditySensor) || this.accessory.addService(this.platform.Service.HumiditySensor);
   

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.RadonSvc.setCharacteristic(this.platform.Characteristic.Name, `Airthings Radon ${accessory.context.device.sn}`);
    this.TempSvc.setCharacteristic(this.platform.Characteristic.Name, `Airthings Temperature ${accessory.context.device.sn}`);
    this.HumiditySvc.setCharacteristic(this.platform.Characteristic.Name, `Airthings Humidity ${accessory.context.device.sn}`);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.TempSvc.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getAttr('temperature'));

    // register handlers for the Brightness Characteristic
    this.HumiditySvc.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getAttr('humidity'));

    this.RadonSvc.getCharacteristic(this.platform.AirthingsCharacteristics.RadonSta)
      .onGet(this.getAttr('radon_sta'));
    this.RadonSvc.getCharacteristic(this.platform.AirthingsCharacteristics.RadonLta)
      .onGet(this.getAttr('radon_lta'));
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
      // push the new value to HomeKit
      this.RadonSvc.updateCharacteristic(this.platform.AirthingsCharacteristics.RadonLta, data?.radon_lta || 0);
      this.RadonSvc.updateCharacteristic(this.platform.AirthingsCharacteristics.RadonSta, data?.radon_sta || 0);
      data && this.updateHomeKitAirQualityChar(data) 
      this.TempSvc.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, data?.temperature || 0);
      this.HumiditySvc.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, data?.humidity || 0);
      this.platform.log.debug('Triggering RadonSvc:', data);
    }, this.platform.config.refreshTime * 1000);
  }
  updateHomeKitAirQualityChar = (lastData: WAVE2) => {
    const { radon_sta, lastUpdateAt } = lastData;
    let aq = this.platform.Characteristic.AirQuality.UNKNOWN;
    if (radon_sta >= 150) {
      aq =this.platform.Characteristic.AirQuality.POOR;
    }
    else if (radon_sta >= 100) {
      aq =this.platform.Characteristic.AirQuality.FAIR;
    }
    else if (radon_sta >= 50) {
      aq =this.platform.Characteristic.AirQuality.GOOD;
    }
    else {
      aq =this.platform.Characteristic.AirQuality.EXCELLENT;
    }
    // HomeKit Air Quality Service
    this.RadonSvc.updateCharacteristic(this.platform.Characteristic.AirQuality, aq);
    this.RadonSvc.updateCharacteristic(this.platform.Characteristic.OzoneDensity, radon_sta)
    this.RadonSvc.updateCharacteristic(this.platform.Characteristic.StatusActive,
      Date.now() / 1000 - lastUpdateAt / 1000 < 2 * 3600
  );
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.
   * In this case, you may decide not to implement `onGet` handlers, which may speed up
   * the responsiveness of your device in the Home app.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  getAttr = (type: 'radon_lta' | 'radon_sta' | 'temperature' | 'humidity') => async (): Promise<number> => {
    if (!this.lastData) {
      const data = await this.platform.scanner.getData(this.device);
      this.lastData = data;
    }
    return this.lastData[`${type}`]
  }
}
