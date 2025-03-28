// tests/integration_tests/analysisRoutes.test.ts
// Import Jest types
import {
  describe,
  test,
  expect,
  beforeAll,
  afterEach,
  afterAll,
} from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import * as db from './testdb';
import analysisRoutes from '../../backend/routes/analysisRoutes';
import User from '../../backend/models/User.model';
import { Transaction } from '../../backend/models/Transaction.model';

const app = express();
app.use(express.json());
app.use('/api', analysisRoutes);

process.env.JWT_SECRET = 'test_jwt_secret';

const createToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

describe('Analysis Routes Integration Test', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  afterAll(async () => {
    await db.closeDatabase();
  });

  test('GET /api/analytics - should return analysis data for valid user and token', async () => {
    const user = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      firebaseUid: 'abc123',
    });

    userId = user._id.toString();
    token = createToken(userId);

    await Transaction.create([
      {
        user_id: userId,
        name: 'Groceries',
        amount: 50.25,
        date: new Date().toISOString(),
        category: ['Shopping', 'Groceries'],
        transaction_type: 'place',
        transaction_id: 'txn_001',
        iso_currency_code: 'USD',
        account_id: new mongoose.Types.ObjectId(),
      },
      {
        user_id: userId,
        name: 'Salary',
        amount: -500,
        date: new Date().toISOString(),
        category: ['Income', 'Job'],
        transaction_type: 'income',
        transaction_id: 'txn_002',
        iso_currency_code: 'USD',
        account_id: new mongoose.Types.ObjectId(),
      },
    ]);

    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('balance');
    expect(res.body).toHaveProperty('monthlySpending');
    expect(res.body).toHaveProperty('weeklySpending');
    expect(res.body).toHaveProperty('yearlySpending');
    expect(res.body).toHaveProperty('thisMonth');
    expect(res.body).toHaveProperty('monthAvg');
    expect(res.body).toHaveProperty('dailyAvg');
    expect(res.body).toHaveProperty('recurringExpenses');
    expect(res.body).toHaveProperty('topSources');
  });

  test('GET /api/analytics - should return 401 if no token provided', async () => {
    const res = await request(app).get('/api/analytics');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication/i);
  });

  test('GET /api/analytics - should return empty object if user not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeToken = createToken(fakeId.toString());

    const res = await request(app)
      .get('/api/analytics')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(200);
    // The API returns an empty object for users not found, not a 404 error
    expect(res.body).toEqual({});
  });
});