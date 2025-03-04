import { Buffer } from 'buffer';
// more info on: https://github.com/ztroop/wave-reader-utils/blob/master/docs/specs.md

export const WAVE2_CURR_VAL_UUID = 'b42e4dccade711e489d3123b93f75cba';
const parseSerial = (manufacturer_data: Buffer): number | null => {
  try {
    const ID = manufacturer_data.readUInt16LE(0);
    const SN = manufacturer_data.readUInt32LE(2);
    if (ID === 0x0334) {
      return SN;
    }
  } catch (error) {
    // Return null for non-Airthings devices
    return null;
  }
  return null;
};

const parseWave2Rawdata = (rawdata: Buffer): WAVE2 => {
  const header = rawdata.readUInt8(0);
  if (header !== 1) {
    throw new Error(
      `Incompatible current values version (Expected 1, got ${header})`,
    );
  }

  return {
    humidity: rawdata.readUInt8(1) / 2.0,
    radon_sta: rawdata.readUInt16LE(4),
    radon_lta: rawdata.readUInt16LE(6),
    temperature: rawdata.readUInt16LE(8) / 100.0,
    lastUpdateAt: Date.now(),
  };
};

export { parseSerial, parseWave2Rawdata };
