// backend/tests/coffeeShops.test.js

const request = require('supertest');
const app = require('../src/app');

describe('GET /api/coffee-shops', () => {
  it('should return a list of coffee shops', async () => {
    const res = await request(app)
      .get('/api/coffee-shops')
      .set('Authorization', `Bearer valid_token`)
      .query({ latitude: '37.7749', longitude: '-122.4194' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});