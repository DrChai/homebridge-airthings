/* eslint-disable @typescript-eslint/no-explicit-any */
import { Formats, Perms } from 'homebridge';
export const newRadonSta = (Char: any) =>
  class RadonSta extends Char {
    public static readonly UUID: string =
      '000000C5-0000-1000-8000-0026BB765291'; //SulphurDioxideDensity UUID
    constructor() {
      super('Radon Short Term Avg.', RadonSta.UUID, {
        format: Formats.UINT16,
        perms: [Perms.NOTIFY, Perms.PAIRED_READ],
        unit: 'Bq/m³',
        minValue: 0,
        maxValue: 65535,
        minStep: 1,
      });
      this.value = this.getDefaultValue();
    }
  };

const newRadonLta = (Char: any) =>
  class RadonLta extends Char {
    public static readonly UUID: string =
      '000000C3-0000-1000-8000-0026BB765291'; // Using OzoneDensity
    constructor() {
      super('Radon Long Term Avg.', RadonLta.UUID, {
        format: Formats.UINT16,
        perms: [Perms.NOTIFY, Perms.PAIRED_READ],
        unit: 'Bq/m³',
        minValue: 0,
        maxValue: 65535,
        minStep: 1,
      });
      this.value = this.getDefaultValue();
    }
  };

class AirthingsTypes {
  hap: any;
  displayRadonLTA: boolean;
  displayRadonSTA: boolean;

  constructor(homebridge: any, displayRadonSTA = false, displayRadonLTA = false) {
    this.hap = homebridge.hap;
    this.displayRadonLTA = displayRadonLTA;
    this.displayRadonSTA = displayRadonSTA;
  }
  get Service() {
    const Characteristics = this.Characteristics;
    const hapCharacteristic = this.hap.Characteristic;
    return class AirThingsSensor extends this.hap.Service.AirQualitySensor {
      constructor(displayName?: string, subtype?: string) {
        super(displayName, subtype);
        if (this.displayRadonSTA) {
          this.removeCharacteristic(hapCharacteristic.SulphurDioxideDensity);
          this.addCharacteristic(Characteristics.RadonSta);
        }
        if (this.displayRadonLTA) {
          this.removeCharacteristic(hapCharacteristic.OzoneDensity);
          this.addCharacteristic(Characteristics.RadonLta);
        }
      }
    };
  }
  get Characteristics() {
    return {
      RadonLta: newRadonLta(this.hap.Characteristic),
      RadonSta: newRadonSta(this.hap.Characteristic),
    };
  }
}
export default AirthingsTypes;
