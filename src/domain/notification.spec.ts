import { Notification } from './notification';
import {
  InvalidNotificationTransition,
  NotificationNotEditable,
} from './errors';

const ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const T0 = new Date('2026-01-01T10:00:00.000Z');
const T1 = new Date('2026-01-01T10:05:00.000Z');
const T2 = new Date('2026-01-01T10:10:00.000Z');
const T3 = new Date('2026-01-01T10:15:00.000Z');
const T4 = new Date('2026-01-01T10:20:00.000Z');

function crearPendiente(): Notification {
  return Notification.create({
    id: ID,
    ownerId: OWNER_ID,
    title: 'Hola',
    content: 'Contenido original',
    channel: 'sms',
    recipient: '+5219611234567',
    now: T0,
  });
}

function crearFallida(): Notification {
  const n = crearPendiente();
  n.markFailed('gateway caído', T1);
  return n;
}

function crearEnviada(): Notification {
  const n = crearPendiente();
  n.markSent(T1);
  return n;
}

describe('Notification', () => {
  describe('create', () => {
    it('queda en estado pending', () => {
      expect(crearPendiente().status).toBe('pending');
    });

    it('inicia con attempts en 0', () => {
      expect(crearPendiente().attempts).toBe(0);
    });

    it('inicia con errorMessage nulo', () => {
      expect(crearPendiente().errorMessage).toBeNull();
    });

    it('inicia con sentAt nulo', () => {
      expect(crearPendiente().sentAt).toBeNull();
    });

    it('createdAt y updatedAt son iguales a now', () => {
      const n = crearPendiente();
      expect(n.createdAt).toEqual(T0);
      expect(n.updatedAt).toEqual(T0);
    });

    it('conserva el id recibido (el UUID se genera fuera)', () => {
      expect(crearPendiente().id).toBe(ID);
    });

    it('conserva ownerId, title, content, channel y recipient', () => {
      const n = crearPendiente();
      expect(n.ownerId).toBe(OWNER_ID);
      expect(n.title).toBe('Hola');
      expect(n.content).toBe('Contenido original');
      expect(n.channel).toBe('sms');
      expect(n.recipient).toBe('+5219611234567');
    });
  });

  describe('markSent', () => {
    it('pasa de pending a sent', () => {
      const n = crearPendiente();
      n.markSent(T1);
      expect(n.status).toBe('sent');
    });

    it('fija sentAt con la fecha recibida', () => {
      const n = crearPendiente();
      n.markSent(T1);
      expect(n.sentAt).toEqual(T1);
    });

    it('deja errorMessage en null', () => {
      const n = crearPendiente();
      n.markSent(T1);
      expect(n.errorMessage).toBeNull();
    });

    it('incrementa attempts en 1', () => {
      const n = crearPendiente();
      n.markSent(T1);
      expect(n.attempts).toBe(1);
    });

    it('actualiza updatedAt con la fecha recibida', () => {
      const n = crearPendiente();
      n.markSent(T1);
      expect(n.updatedAt).toEqual(T1);
    });

    it('no modifica createdAt', () => {
      const n = crearPendiente();
      n.markSent(T1);
      expect(n.createdAt).toEqual(T0);
    });

    it('lanza InvalidNotificationTransition desde sent (terminal)', () => {
      const n = crearEnviada();
      expect(() => n.markSent(T2)).toThrow(InvalidNotificationTransition);
    });

    it('lanza InvalidNotificationTransition desde failed', () => {
      const n = crearFallida();
      expect(() => n.markSent(T2)).toThrow(InvalidNotificationTransition);
    });

    it('no altera la notificación cuando la transición es inválida', () => {
      const n = crearFallida();
      expect(() => n.markSent(T2)).toThrow();
      expect(n.status).toBe('failed');
      expect(n.attempts).toBe(1);
      expect(n.sentAt).toBeNull();
      expect(n.updatedAt).toEqual(T1);
    });
  });

  describe('markFailed', () => {
    it('pasa de pending a failed', () => {
      const n = crearPendiente();
      n.markFailed('gateway caído', T1);
      expect(n.status).toBe('failed');
    });

    it('guarda la razón en errorMessage', () => {
      const n = crearPendiente();
      n.markFailed('gateway caído', T1);
      expect(n.errorMessage).toBe('gateway caído');
    });

    it('incrementa attempts en 1', () => {
      const n = crearPendiente();
      n.markFailed('gateway caído', T1);
      expect(n.attempts).toBe(1);
    });

    it('actualiza updatedAt con la fecha recibida', () => {
      const n = crearPendiente();
      n.markFailed('gateway caído', T1);
      expect(n.updatedAt).toEqual(T1);
    });

    it('no fija sentAt', () => {
      const n = crearPendiente();
      n.markFailed('gateway caído', T1);
      expect(n.sentAt).toBeNull();
    });

    it('lanza InvalidNotificationTransition desde sent (terminal)', () => {
      const n = crearEnviada();
      expect(() => n.markFailed('otro error', T2)).toThrow(
        InvalidNotificationTransition,
      );
    });

    it('lanza InvalidNotificationTransition desde failed', () => {
      const n = crearFallida();
      expect(() => n.markFailed('otro error', T2)).toThrow(
        InvalidNotificationTransition,
      );
    });

    it('no altera la notificación cuando la transición es inválida', () => {
      const n = crearEnviada();
      expect(() => n.markFailed('otro error', T2)).toThrow();
      expect(n.status).toBe('sent');
      expect(n.errorMessage).toBeNull();
      expect(n.attempts).toBe(1);
      expect(n.updatedAt).toEqual(T1);
    });
  });

  describe('revise', () => {
    it('vuelve a pending desde failed', () => {
      const n = crearFallida();
      n.revise({ content: 'Nuevo contenido' }, T2);
      expect(n.status).toBe('pending');
    });

    it('limpia errorMessage', () => {
      const n = crearFallida();
      n.revise({ content: 'Nuevo contenido' }, T2);
      expect(n.errorMessage).toBeNull();
    });

    it('actualiza updatedAt con la fecha recibida', () => {
      const n = crearFallida();
      n.revise({ content: 'Nuevo contenido' }, T2);
      expect(n.updatedAt).toEqual(T2);
    });

    it('conserva attempts', () => {
      const n = crearFallida();
      n.revise({ content: 'Nuevo contenido' }, T2);
      expect(n.attempts).toBe(1);
    });

    it('conserva id, ownerId y createdAt', () => {
      const n = crearFallida();
      n.revise(
        { title: 'Otro', content: 'Otro', recipient: '+5219617654321' },
        T2,
      );
      expect(n.id).toBe(ID);
      expect(n.ownerId).toBe(OWNER_ID);
      expect(n.createdAt).toEqual(T0);
    });

    it('aplica title, content y recipient cuando se envían los tres', () => {
      const n = crearFallida();
      n.revise(
        {
          title: 'Nuevo título',
          content: 'Nuevo contenido',
          recipient: '+5219617654321',
        },
        T2,
      );
      expect(n.title).toBe('Nuevo título');
      expect(n.content).toBe('Nuevo contenido');
      expect(n.recipient).toBe('+5219617654321');
    });

    it('con solo title conserva content y recipient', () => {
      const n = crearFallida();
      n.revise({ title: 'Nuevo título' }, T2);
      expect(n.title).toBe('Nuevo título');
      expect(n.content).toBe('Contenido original');
      expect(n.recipient).toBe('+5219611234567');
    });

    it('con solo content conserva title y recipient', () => {
      const n = crearFallida();
      n.revise({ content: 'Nuevo contenido' }, T2);
      expect(n.title).toBe('Hola');
      expect(n.content).toBe('Nuevo contenido');
      expect(n.recipient).toBe('+5219611234567');
    });

    it('con solo recipient conserva title y content', () => {
      const n = crearFallida();
      n.revise({ recipient: '+5219617654321' }, T2);
      expect(n.title).toBe('Hola');
      expect(n.content).toBe('Contenido original');
      expect(n.recipient).toBe('+5219617654321');
    });

    it('con cambios vacíos igual vuelve a pending y conserva los campos', () => {
      const n = crearFallida();
      n.revise({}, T2);
      expect(n.status).toBe('pending');
      expect(n.title).toBe('Hola');
      expect(n.content).toBe('Contenido original');
      expect(n.recipient).toBe('+5219611234567');
    });

    it('lanza NotificationNotEditable desde pending', () => {
      const n = crearPendiente();
      expect(() => n.revise({ title: 'X' }, T2)).toThrow(
        NotificationNotEditable,
      );
    });

    it('lanza NotificationNotEditable desde sent (terminal)', () => {
      const n = crearEnviada();
      expect(() => n.revise({ title: 'X' }, T2)).toThrow(
        NotificationNotEditable,
      );
    });

    it('no altera la notificación cuando no es editable', () => {
      const n = crearEnviada();
      expect(() =>
        n.revise({ title: 'X', recipient: '+5219617654321' }, T2),
      ).toThrow();
      expect(n.status).toBe('sent');
      expect(n.title).toBe('Hola');
      expect(n.recipient).toBe('+5219611234567');
      expect(n.updatedAt).toEqual(T1);
    });
  });

  describe('canal inmutable', () => {
    it('revise no cambia el canal', () => {
      const n = crearFallida();
      n.revise(
        { title: 'Otro', content: 'Otro', recipient: '+5219617654321' },
        T2,
      );
      expect(n.channel).toBe('sms');
    });

    it('revise ignora un channel colado en tiempo de ejecución', () => {
      const n = crearFallida();
      const cambios = {
        title: 'Otro',
        channel: 'email',
      } as unknown as Parameters<Notification['revise']>[0];
      n.revise(cambios, T2);
      expect(n.channel).toBe('sms');
    });

    it('el canal se conserva durante todo el ciclo de vida', () => {
      const n = crearPendiente();
      n.markFailed('error', T1);
      n.revise({ recipient: '+5219617654321' }, T2);
      n.markSent(T3);
      expect(n.channel).toBe('sms');
    });
  });

  describe('ciclo completo', () => {
    it('pending -> failed -> revise -> pending -> failed -> revise -> sent con attempts correcto', () => {
      const n = crearPendiente();
      expect(n.status).toBe('pending');
      expect(n.attempts).toBe(0);

      n.markFailed('primer error', T1);
      expect(n.status).toBe('failed');
      expect(n.attempts).toBe(1);
      expect(n.errorMessage).toBe('primer error');

      n.revise({ recipient: '+5219617654321' }, T2);
      expect(n.status).toBe('pending');
      expect(n.attempts).toBe(1);
      expect(n.errorMessage).toBeNull();

      n.markFailed('segundo error', T3);
      expect(n.status).toBe('failed');
      expect(n.attempts).toBe(2);
      expect(n.errorMessage).toBe('segundo error');

      n.revise({ content: 'Contenido corregido' }, T3);
      expect(n.status).toBe('pending');
      expect(n.attempts).toBe(2);

      n.markSent(T4);
      expect(n.status).toBe('sent');
      expect(n.attempts).toBe(3);
      expect(n.errorMessage).toBeNull();
      expect(n.sentAt).toEqual(T4);
      expect(n.updatedAt).toEqual(T4);
      expect(n.createdAt).toEqual(T0);
    });

    it('tras llegar a sent ya no admite ninguna transición', () => {
      const n = crearEnviada();
      expect(() => n.markSent(T2)).toThrow(InvalidNotificationTransition);
      expect(() => n.markFailed('x', T2)).toThrow(
        InvalidNotificationTransition,
      );
      expect(() => n.revise({ title: 'X' }, T2)).toThrow(
        NotificationNotEditable,
      );
    });
  });

  describe('errores de dominio', () => {
    it('NotificationNotEditable y InvalidNotificationTransition extienden Error', () => {
      expect(new NotificationNotEditable()).toBeInstanceOf(Error);
      expect(new InvalidNotificationTransition()).toBeInstanceOf(Error);
    });
  });
});
