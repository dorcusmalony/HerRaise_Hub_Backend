const request = require('supertest');
const app = require('../src/app');

describe('Health Check Tests', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.message).toBeDefined();
  });

  test('GET / should return API info', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
  });

  test('GET /api/invalid-route should return 404', async () => {
    const response = await request(app).get('/api/invalid-route');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
