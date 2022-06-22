import { MessagePort } from 'worker_threads';

export class Listen {
  public func?: (event: any) => any;

  constructor() {

  }

  run(port: MessagePort, event: any) {
    if (this.func) {
      event.port = port;
      this.func(event);
    }
  }

  trigger(callback: (event: any) => any) {
    this.func = callback;
    return this;
  }
}
