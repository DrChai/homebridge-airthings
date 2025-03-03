import { Formats, Perms } from "homebridge";
export const newRadonSta = (Char: any) =>
  class RadonSta extends Char {
    public static readonly UUID: string =
      "B42E01AA-ADE7-11E4-89D3-123B93F75CBA";
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
      "B42E0A4C-ADE7-11E4-89D3-123B93F75CBA";
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
      return class AirThingsSensor extends this.hap.Service.AirQualitySensor {
        constructor(displayName?: string, subtype?: string) {
          super(displayName, subtype);
          this.addCharacteristic(Characteristics.RadonLta);
          this.addCharacteristic(Characteristics.RadonSta);
        }
      }
    }
    get Characteristics() {
      return {
        RadonLta: newRadonLta(this.hap.Characteristic),
        RadonSta: newRadonSta(this.hap.Characteristic),
      };
    }
  };
export default AirthingsTypes;
