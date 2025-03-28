import { jest, describe, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { Goal } from '../backend/models/Goal.model';
// const Goal = require('../backend/models/Goal');


describe('Goal Model Unit Tests', () => {
  test('should create a valid goal with all required fields', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Set date to 1 year in the future


    const validGoal = new Goal({
      title: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate,
      category: 'Savings',
      type: 'Savings',
      userId: '65fc123456789abcdef12345'
    });


    const errors = validGoal.validateSync();
    expect(errors).toBeUndefined();
  });


  test('should fail validation when required fields are missing', () => {
    const invalidGoal = new Goal({
      title: 'Test Goal',
      // Missing targetAmount and targetDate
      currentAmount: 0,
      category: 'Savings',
      type: 'Savings',
      userId: '65fc123456789abcdef12345'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['targetAmount']).toBeDefined();
    expect(errors?.errors['targetDate']).toBeDefined();
  });


  test('should fail validation when category is missing for savings goal', () => {
    const invalidGoal = new Goal({
      title: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: new Date('2024-12-31'),
      type: 'Savings',
      // Missing category for savings goal
      userId: '65fc123456789abcdef12345'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['category']).toBeDefined();
  });


  test('should fail validation when type is not valid', () => {
    const invalidGoal = new Goal({
      title: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: new Date('2024-12-31'),
      category: 'Savings',
      type: 'Invalid Type', // Invalid type
      userId: '65fc123456789abcdef12345'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['type']).toBeDefined();
  });


  test('should fail validation when targetAmount is negative', () => {
    const invalidGoal = new Goal({
      title: 'Test Goal',
      targetAmount: -1000,
      currentAmount: 0,
      targetDate: new Date('2024-12-31'),
      category: 'Savings',
      type: 'Savings',
      userId: '65fc123456789abcdef12345'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['targetAmount']).toBeDefined();
  });


  test('should fail validation when currentAmount is greater than targetAmount', () => {
    const invalidGoal = new Goal({
      title: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 2000,
      targetDate: new Date('2024-12-31'),
      category: 'Savings',
      type: 'Savings',
      userId: '65fc123456789abcdef12345'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['currentAmount']).toBeDefined();
  });


  test('should fail validation when targetDate is in the past', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);


    const invalidGoal = new Goal({
      title: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: pastDate,
      category: 'Savings',
      type: 'Savings',
      userId: '65fc123456789abcdef12345'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['targetDate']).toBeDefined();
  });


  test('should not allow target date in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
   
    const invalidGoal = new Goal({
      title: 'Test Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: pastDate,
      type: 'Savings',
      category: 'Emergency Fund'
    });


    const errors = invalidGoal.validateSync();
    expect(errors).toBeDefined();
    expect(errors?.errors['targetDate']).toBeDefined();
  });


  test('should require category for Savings type but not for Spending Limit', () => {
    // Test Savings type requires category
    const savingsGoal = new Goal({
      title: 'Savings Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: new Date('2025-12-31'),
      type: 'Savings'
      // Missing category
    });


    const savingsErrors = savingsGoal.validateSync();
    expect(savingsErrors).toBeDefined();
    expect(savingsErrors?.errors['category']).toBeDefined();


    // Test Spending Limit type doesn't require category
    const spendingGoal = new Goal({
      title: 'Spending Goal',
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: new Date('2025-12-31'),
      type: 'Spending Limit'
      // No category needed
    });


    const spendingErrors = spendingGoal.validateSync();
    expect(spendingErrors?.errors['category']).toBeUndefined();
  });


  test('should validate title length', () => {
    // Test empty title
    const emptyTitleGoal = new Goal({
      title: '',  // Empty title
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: new Date('2025-12-31'),
      type: 'Savings',
      category: 'Emergency Fund'
    });


    const emptyErrors = emptyTitleGoal.validateSync();
    expect(emptyErrors?.errors['title']).toBeDefined();


    // Test very long title (if there's a max length requirement)
    const longTitle = 'a'.repeat(101);
    const longTitleGoal = new Goal({
      title: longTitle,
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: new Date('2025-12-31'),
      type: 'Savings',
      category: 'Emergency Fund'
    });


    const longErrors = longTitleGoal.validateSync();
    expect(longErrors?.errors['title']).toBeDefined();
  });
});
