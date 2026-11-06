import { SerialQrFramer } from './serial-qr-framer';

describe('SerialQrFramer', () => {
  const tokenA = 'AbC_123-abc';
  const tokenB = 'Another_456-xY';

  it('splits CR+LF in separate USB chunks without an empty reading', () => {
    const tokens: string[] = [];
    const failures: string[] = [];
    const framer = new SerialQrFramer(
      token => tokens.push(token), error => failures.push(error)
    );

    framer.push('AbC_');
    framer.push('123-abc\r');
    framer.push('\nAnother_456-xY\r\n');

    expect(tokens).toEqual([tokenA, tokenB]);
    expect(failures).toEqual([]);
  });

  it('handles multiple complete scans in one serial chunk', () => {
    const tokens: string[] = [];
    const framer = new SerialQrFramer(token => tokens.push(token), () => {});
    framer.push('ABC\nDEF\nGHI\r');
    expect(tokens).toEqual(['ABC', 'DEF', 'GHI']);
  });

  it('never submits incomplete, invalid or oversized frames', () => {
    const tokens: string[] = [];
    const failures: string[] = [];
    const framer = new SerialQrFramer(
      value => tokens.push(value), error => failures.push(error)
    );

    framer.push('INCOMPLETE');
    expect(tokens).toEqual([]);
    framer.discardIncomplete();
    framer.push('valid_123\r');
    framer.push('a'.repeat(120) + '\r');
    framer.push('invalid spaces\n');

    expect(tokens).toEqual(['valid_123']);
    expect(failures).toHaveLength(2);
  });

  it('keeps concurrent port buffers independent', () => {
    const first: string[] = [];
    const second: string[] = [];
    const a = new SerialQrFramer(token => first.push(token), () => {});
    const b = new SerialQrFramer(token => second.push(token), () => {});

    a.push('FIRST');
    b.push('SECOND\r\n');
    a.push('_SCAN\r\n');

    expect(first).toEqual(['FIRST_SCAN']);
    expect(second).toEqual(['SECOND']);
  });
});
