/** Bitácora compartida por los fakes para verificar el orden de los eventos. */
export class EventLog {
  readonly events: string[] = [];

  push(event: string): void {
    this.events.push(event);
  }
}
