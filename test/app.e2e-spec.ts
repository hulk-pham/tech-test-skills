import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const hasDb = !!process.env.DATABASE_URL;
const describeOrSkip = hasDb ? describe : describe.skip;

describeOrSkip('Metrics API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns 200 and status ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });

  it('POST /metrics then GET list and chart', async () => {
    const userId = `e2e-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 10,
        unit: 'm',
        recordedAt: '2025-03-01T08:00:00.000Z',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/metrics')
      .query({ userId, type: 'Distance', limit: 10 })
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.nextCursor).toBeDefined();

    const chart = await request(app.getHttpServer())
      .get('/metrics/chart')
      .query({
        userId,
        type: 'Distance',
        period: '1m',
        timeZone: 'UTC',
        endDate: '2025-03-31',
      })
      .expect(200);

    expect(Array.isArray(chart.body)).toBe(true);
    const point = chart.body.find(
      (p: { date: string }) => p.date === '2025-03-01',
    );
    expect(point).toBeDefined();
    expect(point.value).toBe(10);
    expect(point.unit).toBe('m');
  });

  it('POST /metrics rejects unit incompatible with type', () => {
    return request(app.getHttpServer())
      .post('/metrics')
      .send({
        userId: `e2e-bad-unit-${Date.now()}`,
        type: 'Distance',
        value: 1,
        unit: 'C',
        recordedAt: '2025-03-01T08:00:00.000Z',
      })
      .expect(400);
  });

  it('GET /metrics rejects invalid cursor', () => {
    return request(app.getHttpServer())
      .get('/metrics')
      .query({
        userId: `e2e-cursor-${Date.now()}`,
        type: 'Distance',
        cursor: 'not-a-valid-cursor',
      })
      .expect(400);
  });

  it('GET /metrics applies targetUnit (m → cm)', async () => {
    const userId = `e2e-convert-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 2,
        unit: 'm',
        recordedAt: '2025-05-01T10:00:00.000Z',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/metrics')
      .query({
        userId,
        type: 'Distance',
        limit: 5,
        targetUnit: 'cm',
      })
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    const first = list.body.items[0];
    expect(first.value).toBe(200);
    expect(first.unit).toBe('cm');
  });

  it('GET /metrics rejects targetUnit invalid for type', async () => {
    const userId = `e2e-bad-target-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 1,
        unit: 'm',
        recordedAt: '2025-05-02T10:00:00.000Z',
      })
      .expect(201);

    return request(app.getHttpServer())
      .get('/metrics')
      .query({
        userId,
        type: 'Distance',
        targetUnit: 'K',
      })
      .expect(400);
  });

  it('GET /metrics/chart rejects invalid IANA timeZone', () => {
    return request(app.getHttpServer())
      .get('/metrics/chart')
      .query({
        userId: 'x',
        type: 'Distance',
        period: '1m',
        timeZone: 'NotA/Real_Zone',
      })
      .expect(400);
  });

  it('GET /metrics/chart respects targetUnit', async () => {
    const userId = `e2e-chart-unit-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 1,
        unit: 'm',
        recordedAt: '2025-06-10T12:00:00.000Z',
      })
      .expect(201);

    const chart = await request(app.getHttpServer())
      .get('/metrics/chart')
      .query({
        userId,
        type: 'Distance',
        period: '1m',
        timeZone: 'UTC',
        endDate: '2025-06-30',
        targetUnit: 'cm',
      })
      .expect(200);

    const dayPoint = chart.body.find(
      (p: { date: string }) => p.date === '2025-06-10',
    );
    expect(dayPoint).toBeDefined();
    expect(dayPoint.value).toBe(100);
    expect(dayPoint.unit).toBe('cm');
  });

  it('keyset pagination: second page returns older row', async () => {
    const userId = `e2e-keyset-${Date.now()}`;
    const server = app.getHttpServer();

    await request(server)
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 1,
        unit: 'm',
        recordedAt: '2025-07-03T10:00:00.000Z',
      })
      .expect(201);
    await request(server)
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 2,
        unit: 'm',
        recordedAt: '2025-07-02T10:00:00.000Z',
      })
      .expect(201);
    await request(server)
      .post('/metrics')
      .send({
        userId,
        type: 'Distance',
        value: 3,
        unit: 'm',
        recordedAt: '2025-07-01T10:00:00.000Z',
      })
      .expect(201);

    const firstPage = await request(server)
      .get('/metrics')
      .query({ userId, type: 'Distance', limit: 2 })
      .expect(200);

    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.items[0].value).toBe(1);
    expect(firstPage.body.items[1].value).toBe(2);
    expect(firstPage.body.nextCursor).toBeTruthy();

    const secondPage = await request(server)
      .get('/metrics')
      .query({
        userId,
        type: 'Distance',
        limit: 2,
        cursor: firstPage.body.nextCursor,
      })
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].value).toBe(3);
    expect(secondPage.body.nextCursor).toBeNull();
  });

  it('POST /metrics Temperature and list returns value', async () => {
    const userId = `e2e-temp-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/metrics')
      .send({
        userId,
        type: 'Temperature',
        value: 0,
        unit: 'C',
        recordedAt: '2025-08-01T15:00:00.000Z',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/metrics')
      .query({ userId, type: 'Temperature', limit: 5, targetUnit: 'F' })
      .expect(200);

    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    expect(list.body.items[0].value).toBe(32);
    expect(list.body.items[0].unit).toBe('F');
  });
});
