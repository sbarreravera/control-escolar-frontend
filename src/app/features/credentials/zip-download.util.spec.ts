import {
  createZipBlob,
  dataUrlToBytes
} from './zip-download.util';

describe('zip-download utilities', () => {
  it('decodes base64 data URLs into bytes', () => {
    const bytes = dataUrlToBytes('data:image/png;base64,AQIDBA==');

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it('creates a ZIP with the expected file name and directory records', async () => {
    const fileName = 'A001_Samuel_Barrera.png';
    const blob = createZipBlob([
      {
        name: fileName,
        data: new Uint8Array([1, 2, 3, 4])
      }
    ]);

    expect(blob.type).toBe('application/zip');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);

    expect(view.getUint32(0, true)).toBe(0x04034b50);

    const fileNameLength = view.getUint16(26, true);
    const decodedFileName = new TextDecoder().decode(
      bytes.slice(30, 30 + fileNameLength)
    );
    expect(decodedFileName).toBe(fileName);

    expect(
      view.getUint32(bytes.length - 22, true)
    ).toBe(0x06054b50);
    expect(
      view.getUint16(bytes.length - 12, true)
    ).toBe(1);
  });
});
