import { Clock } from '../ports/clock';

export class FakeClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date('2026-01-01T10:00:00.000Z')) {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = new Date(date);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
