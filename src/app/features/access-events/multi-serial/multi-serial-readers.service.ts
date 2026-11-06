import { Injectable, signal } from '@angular/core';
import { AccessEventType } from '../access-event.models';
import { SerialQrFramer } from './serial-qr-framer';

interface SerialPortAdapter {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

interface SerialBrowserAdapter {
  requestPort(): Promise<SerialPortAdapter>;
}

interface ActiveReader {
  id: number;
  name: string;
  eventType: AccessEventType;
  port: SerialPortAdapter;
  active: boolean;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  readTask?: Promise<void>;
  status: 'connected' | 'disconnected';
  onRead: (token: string, readerId: number) => void;
  onError: (reason: string, readerId: number) => void;
}

export interface ConnectedSerialReader {
  id: number;
  name: string;
  eventType: AccessEventType;
  status: 'connected' | 'disconnected';
}

/**
 * Each USB-COM port has its OWN stream, TextDecoder and CR/LF framer.
 * This avoids the interleaving caused by USB-HID keyboard emulation.
 * A port's browser permission never reveals its Windows COM number.
 */
@Injectable({ providedIn: 'root' })
export class MultiSerialReadersService {
  private readonly connections = new Map<number, ActiveReader>();
  private nextId = 1;
  private readonly readersState = signal<readonly ConnectedSerialReader[]>([]);

  readonly readers = this.readersState.asReadonly();

  get supported(): boolean {
    return typeof navigator !== 'undefined' &&
      typeof (navigator as Navigator & { serial?: SerialBrowserAdapter }).serial
        ?.requestPort === 'function' &&
      globalThis.isSecureContext !== false;
  }

  /**
   * Must be invoked synchronously from a button click so the browser can
   * show its native serial-device permission picker.
   */
  async connect(
    name: string,
    eventType: AccessEventType,
    onRead: (token: string, readerId: number) => void,
    onError: (reason: string, readerId: number) => void
  ): Promise<number> {
    const serial = (navigator as Navigator & {
      serial?: SerialBrowserAdapter
    }).serial;

    if (!serial || !this.supported) {
      throw new Error('Web Serial requiere Chrome/Edge compatible y HTTPS.');
    }

    // requestPort is intentionally before the first await.
    const port = await serial.requestPort();
    if ([...this.connections.values()].some(item => item.port === port)) {
      throw new Error('Ese puerto ya está conectado a esta pantalla.');
    }

    await port.open({ baudRate: 9600 });

    const id = this.nextId++;
    const connection: ActiveReader = {
      id,
      name: name.trim(),
      eventType,
      port,
      active: true,
      status: 'connected',
      onRead,
      onError
    };

    this.connections.set(id, connection);
    this.emitState();

    connection.readTask = this.read(connection);
    return id;
  }

  async disconnect(readerId: number): Promise<void> {
    const connection = this.connections.get(readerId);
    if (!connection) {
      return;
    }

    connection.active = false;
    try {
      await connection.reader?.cancel();
    } catch {
      // Unplugged devices can reject cancellation.
    }

    try {
      await connection.readTask;
    } catch {
      // Read errors have already been reported to the UI.
    }

    try {
      await connection.port.close();
    } catch {
      // Device may already be disconnected at OS level.
    }

    this.connections.delete(readerId);
    this.emitState();
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      [...this.connections.keys()].map(id => this.disconnect(id))
    );
  }

  private async read(connection: ActiveReader): Promise<void> {
    const decoder = new TextDecoder();
    const framer = new SerialQrFramer(
      token => connection.onRead(token, connection.id),
      error => connection.onError(error, connection.id)
    );

    try {
      while (connection.active && connection.port.readable) {
        const reader = connection.port.readable.getReader();
        connection.reader = reader;

        try {
          while (connection.active) {
            const result = await reader.read();
            if (result.done) {
              break;
            }
            if (result.value && connection.active) {
              framer.push(decoder.decode(result.value, { stream: true }));
            }
          }
        } catch (error: unknown) {
          if (connection.active) {
            connection.onError(
              'La lectura serial se interrumpió; revisa la conexión USB.',
              connection.id
            );
          }
          break;
        } finally {
          connection.reader = undefined;
          reader.releaseLock();
        }

        // A closed stream or unplugged scanner needs explicit reconnection.
        break;
      }
    } finally {
      framer.discardIncomplete();
      connection.active = false;
      connection.status = 'disconnected';
      if (this.connections.has(connection.id)) {
        this.emitState();
      }
    }
  }

  private emitState(): void {
    this.readersState.set(
      [...this.connections.values()].map(item => ({
        id: item.id,
        name: item.name,
        eventType: item.eventType,
        status: item.status
      }))
    );
  }
}
