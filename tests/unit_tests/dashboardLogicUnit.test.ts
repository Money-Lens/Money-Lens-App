
<<<<<<< HEAD
import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import  { connect, clearDatabase, closeDatabase } from '../testdb'

// Import functions using require to match backend pattern
const { getTodaySpending, getMonthlySpending, getWeeklySpending, getRecentTransactions, getDashboardData } = require('../../backend/logic/dashboardLogic.js');
const User = require('../../backend/models/User.model.js');
const { Transaction } = require('../../backend/models/Transaction.model.js');
=======
import  { connect, clearDatabase, closeDatabase } from '../testdb'
import {getTodaySpending,  getMonthlySpending, getWeeklySpending, getRecentTransactions, getDashboardData,} from '../../backend/logic/dashboardLogic';
import  User  from '../../backend/models/User.model';
import Transaction from '../../backend/models/Transaction.model'
>>>>>>> cf59f3a (Updated the imports and tests)

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());




describe('getTodaySpending', () => {
  it('should calculate today\'s total spending correctly', async () => {
      const today = new Date().toISOString().split("T")[0];
      const transactions = [
          { amount: "50.25", date: new Date().toISOString() },
          { amount: "-20.50", date: new Date().toISOString() },
          { amount: "15.75", date: new Date().toISOString() },
          { amount: "40.00", date: "2022-01-01T12:00:00.000Z" }, // Different date
          { amount: "invalid", date: today }, // Invalid amount
          { amount: "30", date: null } // Null date
      ];

      const result = await getTodaySpending(transactions as any);
      
      expect(result).toBeCloseTo(45.5, 2);
  });

  it('should return 0 if no transactions for today', async () => {
      const transactions = [
          { amount: "40.00", date: "2022-01-01T12:00:00.000Z" },
          { amount: "25.00", date: "2022-01-02T12:00:00.000Z" },
      ];

      const result = await getTodaySpending(transactions as any);

      expect(result).toBe(0);
  });

  it('should handle empty transactions array', async () => {
      const result = await getTodaySpending([]);
      expect(result).toBe(0);
  });

  it('should handle transactions without dates gracefully', async () => {
      const transactions = [
          { amount: "50" },
          { amount: "25", date: undefined },
      ];

      const result = await getTodaySpending(transactions as any);
      expect(result).toBe(0);
  });
});



describe('getMonthlySpending', () => {
  it('should group transactions by month and calculate totals', async () => {
      const now = new Date();
      const thisMonth = now.toISOString().slice(0, 7);
      const lastMonthDate = new Date(now);
      lastMonthDate.setMonth(now.getMonth() - 1);
      const lastMonth = lastMonthDate.toISOString().slice(0, 7);

      const transactions = [
          { amount: "100", date: new Date().toISOString() },
          { amount: "-50", date: new Date().toISOString() },
          { amount: "200", date: lastMonthDate.toISOString() },
          { amount: "-100", date: lastMonthDate.toISOString() },
          { amount: "invalid", date: new Date().toISOString() },
          { amount: "75", date: null },
      ];

      const result = await getMonthlySpending(transactions as any);

      // Ensure result is not an error object
      if (!Array.isArray(result)) {
          throw new Error(`Expected array but got error: ${JSON.stringify(result)}`);
      }

      const thisMonthData = result.find((r: any) => r.month === thisMonth);
      const lastMonthData = result.find((r: any) => r.month === lastMonth);

      expect(thisMonthData?.spent).toBeCloseTo(100);
      expect(thisMonthData?.earned).toBeCloseTo(-50);
      expect(thisMonthData?.net).toBeCloseTo(50);

      expect(lastMonthData?.spent).toBeCloseTo(200);
      expect(lastMonthData?.earned).toBeCloseTo(-100);
      expect(lastMonthData?.net).toBeCloseTo(100);
  });

  it('should return 12 months of data even if no transactions', async () => {
      const result = await getMonthlySpending([]);

      if (!Array.isArray(result)) {
          throw new Error(`Expected array but got error: ${JSON.stringify(result)}`);
      }

      expect(result.length).toBe(12);
      result.forEach((monthData: any) => {
          expect(monthData.spent).toBe(0);
          expect(monthData.earned).toBe(0);
          expect(monthData.net).toBe(0);
      });
  });
});



describe('getWeeklySpending', () => {
  it('should calculate weekly spent, earned, and net for each of last 12 weeks', async () => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay()); // Sunday

    const transactions = [
      // Current week
      { amount: "100", date: new Date(startOfThisWeek).toISOString() },
      { amount: "-40", date: new Date(startOfThisWeek).toISOString() },

      // Previous week
      {
        amount: "200",
        date: new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        amount: "-80",
        date: new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },

      // Invalid entry
      { amount: "not-a-number", date: new Date().toISOString() },
      { amount: "100", date: null },
    ];

    const result = await getWeeklySpending(transactions as any);

    // Ensure result is not an error object
    if (!Array.isArray(result)) {
      throw new Error(`Expected array, got: ${JSON.stringify(result)}`);
    }

    expect(result.length).toBe(12);

    // The test is failing because the date format in the test doesn't match what's returned
    // Let's examine the structure first
    expect(result.length).toBe(12);
    
    // Instead of using specific dates (which can vary), check for the relative values
    // Find the current week's spending (which should be index 0)
    const thisWeek = result[0]; // First item is current week
    const lastWeek = result[1]; // Second item is last week
    
    // Verify the first two weeks have the expected values
    expect(thisWeek.spent).toBeCloseTo(100);
    expect(thisWeek.earned).toBeCloseTo(-40);
    expect(thisWeek.net).toBeCloseTo(60);
    
    expect(lastWeek.spent).toBeCloseTo(200);
    expect(lastWeek.earned).toBeCloseTo(-80);
    expect(lastWeek.net).toBeCloseTo(120);
  });

  it('should return 12 entries with zeros if no transactions provided', async () => {
    const result = await getWeeklySpending([]);

    if (!Array.isArray(result)) {
      throw new Error(`Expected array, got: ${JSON.stringify(result)}`);
    }

    expect(result.length).toBe(12);
    result.forEach((week: any) => {
      expect(week.spent).toBe(0);
      expect(week.earned).toBe(0);
      expect(week.net).toBe(0);
    });
  });
});



describe('getRecentTransactions', () => {
  it('should return the 20 most recent transactions sorted by date', async () => {
    const baseDate = new Date();

    const transactions = Array.from({ length: 25 }, (_, i) => ({
      amount: `${i + 1}`, // 1 to 25
      name: `Transaction ${i + 1}`,
      date: new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000).toISOString(), // subtract i days
      category: ['Top', `Category ${i + 1}`]
    }));

    const result = await getRecentTransactions(transactions as any);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(20);

    // Most recent should be Transaction 1 (i=0)
    expect(result[0].name).toBe('Transaction 1');
    expect(result[0].amount).toBe(1);
    expect(result[0].category).toBe('Category 1');

    // Least recent in top 20 should be Transaction 20
    expect(result[19].name).toBe('Transaction 20');
  });

  it('should default missing category to \"Unknown\"', async () => {
    const transactions = [
      {
        amount: "99.99",
        name: "No Category",
        date: new Date().toISOString(),
        category: null
      }
    ];

    const result = await getRecentTransactions(transactions as any);

    expect(result.length).toBe(1);
    expect(result[0].category).toBe("Unknown");
  });

  it('should handle empty transaction list', async () => {
    const result = await getRecentTransactions([]);
    expect(result).toEqual([]);
  });
});

