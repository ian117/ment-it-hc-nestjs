import { ArgumentMetadata } from '@nestjs/common';

import { NotificationNotFound } from '../../domain/errors';
import { NonEmptyBodyPipe } from '../pipes/non-empty-body.pipe';
import { NotificationIdPipe } from '../pipes/notification-id.pipe';
import {
  createValidationPipe,
  flattenValidationErrors,
  RequestValidationError,
} from '../request-validation';
import { CreateNotificationDto } from './create-notification.dto';
import { ListNotificationsQuery } from './list-notifications.query';
import { ReviseNotificationDto } from './revise-notification.dto';

const pipe = createValidationPipe();

function body(metatype: new () => object): ArgumentMetadata {
  return { type: 'body', metatype };
}

async function errorsOf(
  value: unknown,
  meta: ArgumentMetadata,
): Promise<{ field: string; message: string }[]> {
  try {
    await pipe.transform(value, meta);
  } catch (e) {
    expect(e).toBeInstanceOf(RequestValidationError);
    return (e as RequestValidationError).errors;
  }
  throw new Error('expected a validation error');
}

const valid = {
  title: 'Hola',
  content: 'x',
  channel: 'sms',
  payload: { recipient: '+5219611234567' },
};

describe('CreateNotificationDto', () => {
  it('acepta un body válido', async () => {
    const dto = (await pipe.transform(
      valid,
      body(CreateNotificationDto),
    )) as CreateNotificationDto;
    expect(dto.payload.recipient).toBe('+5219611234567');
  });

  it('acepta cualquier channel string: el registro decide (ADR-004)', async () => {
    await expect(
      pipe.transform(
        { ...valid, channel: 'whatsapp' },
        body(CreateNotificationDto),
      ),
    ).resolves.toBeDefined();
  });

  it('reporta campos anidados con notación de puntos', async () => {
    const errors = await errorsOf(
      { ...valid, payload: {} },
      body(CreateNotificationDto),
    );
    expect(errors.map((e) => e.field)).toEqual([
      'payload.recipient',
      'payload.recipient',
    ]);
  });

  it('rechaza title vacío, largo y payload ausente', async () => {
    const errors = await errorsOf(
      { title: '', content: 'x', channel: 'sms' },
      body(CreateNotificationDto),
    );
    expect(new Set(errors.map((e) => e.field))).toEqual(
      new Set(['title', 'payload']),
    );

    const long = await errorsOf(
      { ...valid, title: 'a'.repeat(256) },
      body(CreateNotificationDto),
    );
    expect(long.map((e) => e.field)).toEqual(['title']);
  });

  it('rechaza propiedades desconocidas, también dentro de payload', async () => {
    const errors = await errorsOf(
      { ...valid, metadata: {}, payload: { recipient: 'a', extra: 1 } },
      body(CreateNotificationDto),
    );
    expect(errors.map((e) => e.field).sort()).toEqual([
      'metadata',
      'payload.extra',
    ]);
  });

  it('rechaza channel de más de 32 caracteres', async () => {
    const errors = await errorsOf(
      { ...valid, channel: 'c'.repeat(33) },
      body(CreateNotificationDto),
    );
    expect(errors.map((e) => e.field)).toEqual(['channel']);
  });
});

describe('ReviseNotificationDto', () => {
  it('rechaza channel (propiedad desconocida)', async () => {
    const errors = await errorsOf(
      { channel: 'email' },
      body(ReviseNotificationDto),
    );
    expect(errors.map((e) => e.field)).toEqual(['channel']);
  });

  it.each(['title', 'content', 'payload'])(
    'null explícito en %s -> 400',
    async (field) => {
      const errors = await errorsOf(
        { [field]: null },
        body(ReviseNotificationDto),
      );
      expect(errors.map((e) => e.field)).toContain(field);
    },
  );

  it('acepta cambios parciales', async () => {
    await expect(
      pipe.transform(
        { payload: { recipient: 'a@b.co' } },
        body(ReviseNotificationDto),
      ),
    ).resolves.toBeDefined();
  });

  it('NonEmptyBodyPipe rechaza {} y acepta al menos un campo', async () => {
    const empty = (await pipe.transform(
      {},
      body(ReviseNotificationDto),
    )) as object;
    const nonEmpty = new NonEmptyBodyPipe();
    expect(() => nonEmpty.transform(empty)).toThrow(RequestValidationError);
    try {
      nonEmpty.transform(empty);
    } catch (e) {
      expect((e as RequestValidationError).errors[0].field).toBe('body');
    }

    const some = (await pipe.transform(
      { title: 't' },
      body(ReviseNotificationDto),
    )) as object;
    expect(() => new NonEmptyBodyPipe().transform(some)).not.toThrow();
  });
});

describe('ListNotificationsQuery', () => {
  const query: ArgumentMetadata = {
    type: 'query',
    metatype: ListNotificationsQuery,
  };

  it('aplica defaults page=1 limit=20', async () => {
    expect(await pipe.transform({}, query)).toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it('convierte strings a número', async () => {
    expect(
      await pipe.transform({ page: '2', limit: '100' }, query),
    ).toMatchObject({
      page: 2,
      limit: 100,
    });
  });

  it.each([
    { limit: '101' },
    { limit: '0' },
    { page: '0' },
    { page: 'abc' },
    { limit: '1.5' },
  ])('rechaza %j', async (q) => {
    const errors = await errorsOf(q, query);
    expect(errors.length).toBeGreaterThan(0);
    expect(['page', 'limit']).toContain(errors[0].field);
  });
});

describe('NotificationIdPipe', () => {
  const idPipe = new NotificationIdPipe();

  it('acepta un UUID', () => {
    expect(idPipe.transform('0B211DBE-4A57-406C-B3CF-42A5E7111AC6')).toBe(
      '0b211dbe-4a57-406c-b3cf-42a5e7111ac6',
    );
  });

  it.each([
    'abc',
    '123',
    '',
    '0b211dbe-4a57-406c-b3cf-42a5e7111ac',
    'zzzzzzzz-4a57-406c-b3cf-42a5e7111ac6',
  ])('rechaza %j como NotificationNotFound', (v) => {
    expect(() => idPipe.transform(v)).toThrow(NotificationNotFound);
  });
});

describe('flattenValidationErrors', () => {
  it('aplana hijos con prefijo', () => {
    expect(
      flattenValidationErrors([
        {
          property: 'payload',
          children: [
            {
              property: 'recipient',
              constraints: { isString: 'm' },
              children: [],
            },
          ],
        },
      ]),
    ).toEqual([{ field: 'payload.recipient', message: 'm' }]);
  });
});
