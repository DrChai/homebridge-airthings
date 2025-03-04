import { Formats, Perms } from "homebridge";
export const newRadonSta = (Char: any) =>
  class RadonSta extends Char {
    public static readonly UUID: string =
      "000000C5-0000-1000-8000-0026BB765291"; //SulphurDioxideDensity UUID
    constructor() {
      super("Radon Short Term Avg.", RadonSta.UUID, {
        format: Formats.UINT16,
        perms: [Perms.NOTIFY, Perms.PAIRED_READ],
        unit: "Bq/m³",
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
      "000000C3-0000-1000-8000-0026BB765291"; // Using OzoneDensity
    constructor() {
      super("Radon Long Term Avg.", RadonLta.UUID, {
        format: Formats.UINT16,
        perms: [Perms.NOTIFY, Perms.PAIRED_READ],
        unit: "Bq/m³",
        minValue: 0,
        maxValue: 65535,
        minStep: 1,
      });
      this.value = this.getDefaultValue();
    }
  };

class AirthingsTypes {
  hap: any;

  constructor(homebridge: any) {
    this.hap = homebridge.hap;
  }
  get Service() {
    const Characteristics = this.Characteristics;
    const hapCharacteristic = this.hap.Characteristic
    return class AirThingsSensor extends this.hap.Service.AirQualitySensor {
      constructor(displayName?: string, subtype?: string) {
        super(displayName, subtype);
        this.removeCharacteristic(hapCharacteristic.OzoneDensity)
        this.removeCharacteristic(hapCharacteristic.SulphurDioxideDensity)
        this.addCharacteristic(Characteristics.RadonLta);
        this.addCharacteristic(Characteristics.RadonSta);
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
