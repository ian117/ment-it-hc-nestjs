import { IdGenerator } from '../ports/id-generator';

/** UUID v4 válidos y deterministas: ...-000000000001, ...-000000000002, ... */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  newId(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`;
  }
}
