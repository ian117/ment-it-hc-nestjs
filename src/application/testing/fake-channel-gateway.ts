import { OutboundMessage } from '../../domain/channels/channel-policy';
import { ChannelGateway, DeliveryResult } from '../ports/channel-gateway';
import { Clock } from '../ports/clock';
import { EventLog } from './event-log';
import { InMemoryNotificationRepository } from './in-memory-notification.repository';

type Behavior =
  | { kind: 'ok' }
  | { kind: 'fail'; detail: string | null }
  | { kind: 'throw'; error: unknown };

export interface FakeChannelGatewayOptions {
  /** Para registrar el status que ya estaba persistido al entregar. */
  repo?: InMemoryNotificationRepository;
  log?: EventLog;
  clock?: Clock;
}

export class FakeChannelGateway implements ChannelGateway {
  readonly messages: OutboundMessage[] = [];
  private behavior: Behavior = { kind: 'ok' };

  constructor(
    readonly channel: string,
    private readonly options: FakeChannelGatewayOptions = {},
  ) {}

  get calls(): number {
    return this.messages.length;
  }

  succeed(): this {
    this.behavior = { kind: 'ok' };
    return this;
  }

  failWith(detail: string | null): this {
    this.behavior = { kind: 'fail', detail };
    return this;
  }

  throwWith(error: unknown): this {
    this.behavior = { kind: 'throw', error };
    return this;
  }

  deliver(message: OutboundMessage): Promise<DeliveryResult> {
    this.messages.push(message);
    const { repo, log, clock } = this.options;
    if (repo && log) {
      const persisted = repo.persistedStatus(
        // El OutboundMessage no lleva id: se toma el último guardado.
        repo.saves[repo.saves.length - 1]?.id ?? '',
      );
      log.push(`deliver:persisted=${persisted ?? 'none'}`);
    } else {
      log?.push('deliver');
    }
    const at = clock ? clock.now() : new Date('2026-01-01T10:00:01.000Z');
    switch (this.behavior.kind) {
      case 'ok':
        return Promise.resolve({ ok: true, at });
      case 'fail':
        return Promise.resolve({
          ok: false,
          at,
          detail: this.behavior.detail,
        });
      case 'throw':
        return Promise.reject(
          this.behavior.error instanceof Error
            ? this.behavior.error
            : new Error(String(this.behavior.error)),
        );
    }
  }
}
