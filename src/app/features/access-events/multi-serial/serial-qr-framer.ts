/**
 * Reconstructs complete QR tokens from arbitrary USB-COM chunks.
 *
 * A scanner must be configured to terminate each scan with CR, LF or CR+LF.
 * Never treat an incomplete or oversized frame as a valid credential.
 */
export class SerialQrFramer {
  private buffer = '';
  private overflow = false;
  private lastWasCr = false;

  constructor(
    private readonly onFrame: (token: string) => void,
    private readonly onInvalid: (message: string) => void,
    private readonly maxLength = 100
  ) {}

  push(chunk: string): void {
    for (const char of chunk) {
      if (char === '\r' || char === '\n') {
        // CR+LF is one terminator, not two QR readings.
        if (char === '\n' && this.lastWasCr) {
          this.lastWasCr = false;
          continue;
        }
        this.lastWasCr = char === '\r';
        this.finishFrame();
        continue;
      }

      this.lastWasCr = false;
      if (this.overflow) {
        continue;
      }

      this.buffer += char;
      if (this.buffer.length > this.maxLength) {
        this.overflow = true;
        this.buffer = '';
      }
    }
  }

  discardIncomplete(): void {
    this.buffer = '';
    this.overflow = false;
    this.lastWasCr = false;
  }

  private finishFrame(): void {
    if (this.overflow) {
      this.onInvalid('Lectura demasiado larga o sin separador CR/LF.');
    } else if (this.buffer.trim()) {
      const token = this.buffer.trim();
      if (/^[A-Za-z0-9_-]+$/.test(token)) {
        this.onFrame(token);
      } else {
        this.onInvalid('Lectura con caracteres que no corresponden a un QR ISAMAR.');
      }
    }

    this.buffer = '';
    this.overflow = false;
  }
}
