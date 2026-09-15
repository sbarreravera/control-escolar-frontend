export interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

interface PreparedZipEntry extends ZipFileEntry {
  nameBytes: Uint8Array;
  crc32: number;
  localHeaderOffset: number;
  dosDate: number;
  dosTime: number;
}

const CRC_TABLE = buildCrcTable();
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex < 0 || !dataUrl.slice(0, separatorIndex).includes(';base64')) {
    throw new Error('Unsupported data URL');
  }

  const binary = atob(dataUrl.slice(separatorIndex + 1));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

/**
 * Creates a standards-compatible ZIP using the STORE method. QR PNG files are
 * already compressed, so recompressing them would add CPU cost with little
 * benefit and would require an additional third-party dependency.
 */
export function createZipBlob(entries: ZipFileEntry[]): Blob {
  if (entries.length > 0xffff) {
    throw new Error('Too many ZIP entries');
  }

  const now = new Date();
  const { dosDate, dosTime } = toDosDateTime(now);
  const encoder = new TextEncoder();
  const localParts: ArrayBuffer[] = [];
  const preparedEntries: PreparedZipEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = new Uint8Array(30);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, UTF8_FLAG, true);
    view.setUint16(8, STORE_METHOD, true);
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, entry.data.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);

    preparedEntries.push({
      ...entry,
      nameBytes,
      crc32: crc,
      localHeaderOffset: offset,
      dosDate,
      dosTime
    });

    localParts.push(
      toArrayBuffer(localHeader),
      toArrayBuffer(nameBytes),
      toArrayBuffer(entry.data)
    );
    offset += localHeader.length + nameBytes.length + entry.data.length;
  }

  const centralDirectoryOffset = offset;
  const centralParts: ArrayBuffer[] = [];
  let centralDirectorySize = 0;

  for (const entry of preparedEntries) {
    const centralHeader = new Uint8Array(46);
    const view = new DataView(centralHeader.buffer);

    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, UTF8_FLAG, true);
    view.setUint16(10, STORE_METHOD, true);
    view.setUint16(12, entry.dosTime, true);
    view.setUint16(14, entry.dosDate, true);
    view.setUint32(16, entry.crc32, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.localHeaderOffset, true);

    centralParts.push(
      toArrayBuffer(centralHeader),
      toArrayBuffer(entry.nameBytes)
    );
    centralDirectorySize += centralHeader.length + entry.nameBytes.length;
  }

  const endOfCentralDirectory = new Uint8Array(22);
  const endView = new DataView(endOfCentralDirectory.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, centralDirectoryOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob(
    [
      ...localParts,
      ...centralParts,
      toArrayBuffer(endOfCentralDirectory)
    ],
    { type: 'application/zip' }
  );
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? 0xedb88320 ^ (value >>> 1)
        : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosDate:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
    dosTime:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2)
  };
}
