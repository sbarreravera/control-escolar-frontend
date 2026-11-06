import { TestBed } from '@angular/core/testing';
import { MultiSerialReadersService } from './multi-serial-readers.service';

describe('MultiSerialReadersService', () => {
  let service: MultiSerialReadersService;
  const originalSerial = Object.getOwnPropertyDescriptor(navigator, 'serial');

  interface FakeReaderPort {
    readable: ReadableStream<Uint8Array>;
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    getInfo: () => { usbVendorId: number };
    push: (chunk: string) => void;
  }

  function mockPort(): FakeReaderPort {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({
      start(ctrl) { controller = ctrl; }
    });
    return {
      readable,
      open: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getInfo: () => ({ usbVendorId: 123 }),
      push: value => controller.enqueue(new TextEncoder().encode(value))
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MultiSerialReadersService);
  });

  afterEach(async () => {
    await service.disconnectAll();
    if (originalSerial) {
      Object.defineProperty(navigator, 'serial', originalSerial);
    } else {
      Reflect.deleteProperty(navigator, 'serial');
    }
  });

  it('receives independent frames from two serial streams without character interleaving', async () => {
    const one = mockPort();
    const two = mockPort();
    let current = 0;
    Object.defineProperty(navigator, 'serial', {
      configurable: true,
      value: { requestPort: () => Promise.resolve([one, two][current++]) }
    });
    const received: Array<{ id: number; token: string }> = [];

    const firstId = await service.connect(
      'Entrada', 'ENTRY',
      (token, id) => received.push({ id, token }), () => {}
    );
    const secondId = await service.connect(
      'Salida', 'EXIT',
      (token, id) => received.push({ id, token }), () => {}
    );

    one.push('AAA');
    two.push('BBBB\r');
    one.push('_TOKEN\r\n');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(received).toEqual([
      { id: secondId, token: 'BBBB' },
      { id: firstId, token: 'AAA_TOKEN' }
    ]);
    expect(service.readers()).toHaveLength(2);
    expect(one.open).toHaveBeenCalledWith({ baudRate: 9600 });
    expect(two.open).toHaveBeenCalledWith({ baudRate: 9600 });
  });
});
