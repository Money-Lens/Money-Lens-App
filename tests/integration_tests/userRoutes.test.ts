<<<<<<< HEAD
<<<<<<< HEAD

=======
>>>>>>> cf59f3a (Updated the imports and tests)
=======
>>>>>>> alertMessages
import request from 'supertest';
import express from 'express';
import * as db from './testdb';
import userRoutes from '../../backend/routes/userRoutes';
import jwt from 'jsonwebtoken';
import User from '../../backend/models/User.model';
import { describe, beforeAll, afterEach, afterAll, test, expect } from '@jest/globals';
process.env.JWT_SECRET = 'test_jwt_secret';


const app = express();
app.use(express.json());
app.use('/api', userRoutes);


describe("UserRoutes Integration test", () => {
  beforeAll(async () => {
    await db.connect();
  });


  afterEach(async () => {
    await db.clearDatabase();
  });

  afterAll(async () => {
    await db.closeDatabase();
  });

  const testUser = {
    firstName: "TestUser1",
    lastName: "lastname",
    email: "test@gmail.com",
    firebaseUid: "18y8y28egbdiq"
  };

  test("POST /signup - should create a new user", async () => {
    const response = await request(app).post('/api/signup').send(testUser);
    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(testUser.email);
  });

  test("POST /signup - should NOT allow duplicate emails", async () => {
    // First signup
    await request(app).post('/api/signup').send(testUser);

    // Second signup with same email
    const response = await request(app).post('/api/signup').send(testUser);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/already exists/i);
  });

  test("POST /signup - should return 500 if missing fields", async () => {
    const badUser = {
      firstName: "MissingStuff",
      email: "bad@example.com"
      // Missing lastName and firebaseUid
    };

    const response = await request(app).post('/api/signup').send(badUser);
    expect(response.status).toBe(500);
    expect(response.body.message).toBeDefined();
  });

  test("GET / (users list) - should return empty initially", async () => {
    const response = await request(app).get('/api/');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("GET / - should return all users after signup", async () => {
    await request(app).post('/api/signup').send(testUser);

    const response = await request(app).get('/api/');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].email).toBe(testUser.email);
  });


  test("GET / - should return an empty array if no users exist", async () => {
    const response = await request(app).get('/api/');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });
  
  test("GET / - should return all users after creating one", async () => {
    // Create a user first
    const testUser = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      firebaseUid: "uid12345"
    };
  
    await request(app).post('/api/signup').send(testUser);
  
    // Now fetch users
    const response = await request(app).get('/api/');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].email).toBe(testUser.email);
  });

});


describe('GET /verify-token', () => {
    let token: string;
    let userId: string;
  
    const testUser = {
      firstName: 'Verify',
      lastName: 'Tester',
      email: 'verify@example.com',
      firebaseUid: 'verify-uid-123'
    };
  
    beforeAll(async () => {
      await db.connect();
  
      // Create user manually
      const user = new User(testUser);
      await user.save();
      userId = user._id.toString();
  
      // Create JWT manually
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
    });
  
    afterAll(async () => {
      await db.closeDatabase();
    });
  

    test('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/api/verify-token');
      expect(response.status).toBe(401);
    });

    test('should return 404 if user not found', async () => {
        // Valid MongoDB ObjectId that doesn't exist
        const fakeId = '507f191e810c19729de860ff';
      
        const token = jwt.sign(
          { userId: fakeId },
          process.env.JWT_SECRET!, // this should now be defined
          { expiresIn: '1h' }
        );
      
        const response = await request(app)
          .get('/api/verify-token')
          .set('Authorization', `Bearer ${token}`);
      
        // Now that middleware passed, route returns 404 for user not found
        expect(response.status).toBe(404);
        expect(response.body.error.toLowerCase()).toMatch(/not found/);
      });

      
  });

