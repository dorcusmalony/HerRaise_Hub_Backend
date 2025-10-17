const request = require('supertest');
const app = require('../src/app');

describe('API Endpoint Tests', () => {
  describe('Auth Routes', () => {
    test('POST /api/auth/register should exist', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});
      
      // Should not return 404
      expect(response.status).not.toBe(404);
    });

    test('POST /api/auth/login should exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      // Should not return 404
      expect(response.status).not.toBe(404);
    });
  });

  describe('Profile Routes', () => {
    test('GET /api/profile should require authentication', async () => {
      const response = await request(app).get('/api/profile');
      
      // Should return 401 (unauthorized) not 404
      expect(response.status).toBe(401);
    });
  });

  describe('CORS', () => {
    test('Should have CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
