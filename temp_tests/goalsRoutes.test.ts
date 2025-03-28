import { jest, describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
const request = require('supertest');
const express = require('express');
const db = require('./testdb');
import { Goal } from '../backend/models/Goal.model';
const goalsRoutes = require('../../backend/routes/goalsRoutes');

const app = express();
app.use(express.json());
app.use('/goals', goalsRoutes);

// Mock auth middleware
jest.mock('../../backend/middleware/auth.middleware', () => {
  return (req: any, res: any, next: any) => {
    req.user = {  
      _id: '65fc123456789abcdef12345',
      id: '65fc123456789abcdef12345'
    }; // Mock user ID
    next();
  };
});

describe('Goals API Integration Tests', () => {
  beforeAll(async () => {
    await db.connect();
  }, 30000); // 30 second timeout for database connection

  afterEach(async () => {
    await db.clearDatabase();
  });

  afterAll(async () => {
    await db.closeDatabase();
  });

  test('creates a new savings goal', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Set date to 1 year in the future

    const goalData = {
      title: 'Test Savings Goal',
      description: 'Test Description',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings'
    };

    // First verify the goal doesn't exist
    const existingGoal = await Goal.findOne({ title: goalData.title });
    expect(existingGoal).toBeNull();

    // Create the goal
    const response = await request(app)
      .post('/goals')
      .send(goalData)
      .expect(201);

    expect(response.body).toMatchObject({
      title: goalData.title,
      description: goalData.description,
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount,
      category: goalData.category,
      type: goalData.type
    });

    // Verify goal was saved in database
    const savedGoal = await Goal.findOne({ title: goalData.title });
    expect(savedGoal).toBeTruthy();
    expect(savedGoal?.targetAmount).toBe(goalData.targetAmount);
    expect(savedGoal?.description).toBe(goalData.description);
    expect(savedGoal?.category).toBe(goalData.category);
    expect(savedGoal?.type).toBe(goalData.type);
  }, 30000); // 30 second timeout for the test
  test('creates a new spending limit goal', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Set date to 1 year in the future

    const goalData = {
      title: 'Monthly Entertainment Budget',
      description: 'Limit monthly entertainment spending',
      targetAmount: 500,
      currentAmount: 0,
      targetDate: futureDate,
      type: 'Spending Limit'
    };

    // First verify the goal doesn't exist
    const existingGoal = await Goal.findOne({ title: goalData.title });
    expect(existingGoal).toBeNull();

    // Create the goal
    const response = await request(app)
      .post('/goals')
      .send(goalData)
      .expect(201);

    expect(response.body).toMatchObject({
      title: goalData.title,
      description: goalData.description,
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount,
      type: goalData.type
    });

    // Verify goal was saved in database
    const savedGoal = await Goal.findOne({ title: goalData.title });
    expect(savedGoal).toBeTruthy();
    expect(savedGoal?.targetAmount).toBe(goalData.targetAmount);
    expect(savedGoal?.description).toBe(goalData.description);
    expect(savedGoal?.type).toBe(goalData.type);
    expect(savedGoal?.category).toBeUndefined(); // Spending limit goals don't have categories
  }, 30000); // 30 second timeout for the test
  test('returns 400 when creating a goal with invalid data', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1); // Set date to 1 year in the past

    const invalidGoalData = {
      title: 'Invalid Goal',
      description: 'Test Description',
      targetAmount: -1000, // Negative target amount
      currentAmount: 2000, // Current amount exceeds target amount
      targetDate: pastDate, // Past date
      category: 'InvalidCategory', // Invalid category
      type: 'InvalidType' // Invalid type
    };

    // Create the goal with invalid data
    const response = await request(app)
      .post('/goals')
      .send(invalidGoalData)
      .expect(400);

    // Verify error response
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Validation error');

    // Verify goal was not saved in database
    const savedGoal = await Goal.findOne({ title: invalidGoalData.title });
    expect(savedGoal).toBeNull();
  }, 30000); // 30 second timeout for the test
  test('deletes an existing goal', async () => {
    // First create a goal to delete
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const goalData = {
      title: 'Goal to Delete',
      description: 'This goal will be deleted',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings'
    };

    // Create the goal
    const createResponse = await request(app)
      .post('/goals')
      .send(goalData)
      .expect(201);

    const goalId = createResponse.body.id;

    // Verify goal exists in database
    const existingGoal = await Goal.findOne({ _id: goalId });
    expect(existingGoal).toBeTruthy();

    // Delete the goal
    const deleteResponse = await request(app)
      .delete(`/goals/${goalId}`)
      .expect(200);

    // Verify delete response
    expect(deleteResponse.body).toMatchObject({
      success: true,
      id: goalId
    });

    // Verify goal was deleted from database
    const deletedGoal = await Goal.findOne({ _id: goalId });
    expect(deletedGoal).toBeNull();
  }, 30000); // 30 second timeout for the test
  test('gets all goals for the user', async () => {
    // Create multiple goals
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const goals = [
      {
        title: 'First Goal',
        description: 'First Description',
        targetAmount: 1000,
        currentAmount: 0,
        targetDate: futureDate,
        category: 'Savings',
        type: 'Savings'
      },
      {
        title: 'Second Goal',
        description: 'Second Description',
        targetAmount: 2000,
        currentAmount: 0,
        targetDate: futureDate,
        type: 'Spending Limit'
      }
    ];

    // Create goals
    for (const goalData of goals) {
      await request(app)
        .post('/goals')
        .send(goalData)
        .expect(201);
    }

    // Get all goals
    const response = await request(app)
      .get('/goals')
      .expect(200);

    // Verify response
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    expect(response.body[0]).toMatchObject({
      title: goals[0].title,
      description: goals[0].description,
      targetAmount: goals[0].targetAmount,
      currentAmount: goals[0].currentAmount,
      category: goals[0].category,
      type: goals[0].type
    });
    expect(response.body[1]).toMatchObject({
      title: goals[1].title,
      description: goals[1].description,
      targetAmount: goals[1].targetAmount,
      currentAmount: goals[1].currentAmount,
      type: goals[1].type
    });
  }, 30000);
  test('gets a single goal by ID', async () => {
    // Create a goal
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const goalData = {
      title: 'Single Goal',
      description: 'Single Description',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings'
    };

    const createResponse = await request(app)
      .post('/goals')
      .send(goalData)
      .expect(201);

    const goalId = createResponse.body.id;

    // Get the goal
    const response = await request(app)
      .get(`/goals/${goalId}`)
      .expect(200);

    // Verify response
    expect(response.body).toMatchObject({
      id: goalId,
      title: goalData.title,
      description: goalData.description,
      targetAmount: goalData.targetAmount,
      currentAmount: goalData.currentAmount,
      category: goalData.category,
      type: goalData.type
    });
  }, 30000);
  test('adds money to a goal', async () => {
    // Create a goal
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const goalData = {
      title: 'Goal to Add Money',
      description: 'Add money to this goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings'
    };

    const createResponse = await request(app)
      .post('/goals')
      .send(goalData)
      .expect(201);

    const goalId = createResponse.body.id;

    // Add money to the goal
    const addMoneyData = {
      amount: 500
    };

    const response = await request(app)
      .patch(`/goals/${goalId}/add-money`)
      .send(addMoneyData)
      .expect(200);

    // Verify response
    expect(response.body).toMatchObject({
      id: goalId,
      title: goalData.title,
      description: goalData.description,
      targetAmount: goalData.targetAmount,
      currentAmount: 500, // Original 0 + 500
      category: goalData.category,
      type: goalData.type
    });

    // Verify in database
    const updatedGoal = await Goal.findOne({ _id: goalId });
    expect(updatedGoal.currentAmount).toBe(500);
  }, 30000);
  test('returns 400 when creating a goal with missing required fields', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const invalidGoalData = {
      description: 'Missing required fields',
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings'
    };

    // Create the goal with missing required fields
    const response = await request(app)
      .post('/goals')
      .send(invalidGoalData)
      .expect(400);

    // Verify error response
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Title is required');

    // Verify goal was not saved in database
    const savedGoal = await Goal.findOne({ description: invalidGoalData.description });
    expect(savedGoal).toBeNull();
  }, 30000);
  test('returns 404 when getting a non-existent goal', async () => {
    const nonExistentId = '65fc123456789abcdef12345'; // Valid ObjectId format but non-existent

    const response = await request(app)
      .get(`/goals/${nonExistentId}`)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Goal not found');
  }, 30000);
  test('returns 400 when adding negative amount to a goal', async () => {
    // Create a goal
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const goalData = {
      title: 'Goal for Negative Amount',
      description: 'Test negative amount',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings'
    };

    const createResponse = await request(app)
      .post('/goals')
      .send(goalData)
      .expect(201);

    const goalId = createResponse.body.id;

    // Try to add negative amount
    const addMoneyData = {
      amount: -100
    };

    const response = await request(app)
      .patch(`/goals/${goalId}/add-money`)
      .send(addMoneyData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Valid amount is required');

    // Verify current amount hasn't changed
    const goal = await Goal.findOne({ _id: goalId });
    expect(goal.currentAmount).toBe(0);
  }, 30000);
});
