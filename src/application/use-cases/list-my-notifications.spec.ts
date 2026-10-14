import {
  buildWorld,
  OTHER_OWNER,
  OWNER,
  TestWorld,
  VALID_PHONE,
} from '../testing/test-world';

describe('ListMyNotifications', () => {
  let w: TestWorld;
  beforeEach(() => {
    w = buildWorld();
  });

  const create = (ownerId: string, title: string) =>
    w.create.execute({
      ownerId,
      title,
      content: 'c',
      channel: 'sms',
      recipient: VALID_PHONE,
    });

  it('lista vacía si no hay notificaciones', async () => {
    const out = await w.list.execute({ ownerId: OWNER, page: 1, limit: 20 });
    expect(out).toEqual({ data: [], total: 0, page: 1, limit: 20 });
  });

  it('solo devuelve las propias', async () => {
    await create(OWNER, 'mía');
    await create(OTHER_OWNER, 'ajena');
    const out = await w.list.execute({ ownerId: OWNER, page: 1, limit: 20 });
    expect(out.total).toBe(1);
    expect(out.data.map((n) => n.title)).toEqual(['mía']);
  });

  it('ordena las más nuevas primero', async () => {
    await create(OWNER, 'a');
    w.clock.advance(1000);
    await create(OWNER, 'b');
    w.clock.advance(1000);
    await create(OWNER, 'c');
    const out = await w.list.execute({ ownerId: OWNER, page: 1, limit: 20 });
    expect(out.data.map((n) => n.title)).toEqual(['c', 'b', 'a']);
  });

  it('desempata por id descendente con el mismo created_at', async () => {
    await create(OWNER, 'a');
    await create(OWNER, 'b');
    await create(OWNER, 'c');
    const out = await w.list.execute({ ownerId: OWNER, page: 1, limit: 20 });
    expect(out.data.map((n) => n.title)).toEqual(['c', 'b', 'a']);
  });

  it('pagina y reporta el total completo', async () => {
    for (const t of ['a', 'b', 'c', 'd', 'e']) {
      w.clock.advance(1000);
      await create(OWNER, t);
    }
    const p1 = await w.list.execute({ ownerId: OWNER, page: 1, limit: 2 });
    const p2 = await w.list.execute({ ownerId: OWNER, page: 2, limit: 2 });
    const p3 = await w.list.execute({ ownerId: OWNER, page: 3, limit: 2 });
    const p4 = await w.list.execute({ ownerId: OWNER, page: 4, limit: 2 });
    expect(p1.data.map((n) => n.title)).toEqual(['e', 'd']);
    expect(p2.data.map((n) => n.title)).toEqual(['c', 'b']);
    expect(p3.data.map((n) => n.title)).toEqual(['a']);
    expect(p4.data).toEqual([]);
    expect([p1.total, p2.total, p3.total, p4.total]).toEqual([5, 5, 5, 5]);
    expect(p2.page).toBe(2);
    expect(p2.limit).toBe(2);
  });
});
