// Import Jest types
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Import required modules
const { getDashboardData } = require("../../backend/logic/dashboardLogic.js");
const User = require("../../backend/models/User.model.js");
const { Transaction } = require("../../backend/models/Transaction.model.js");
const request = require("supertest");
const express = require("express");
const dashboardRouter = require("../../backend/routes/dashboardRoutes.js");

// Mock dependencies
jest.mock("../../backend/middleware/auth.middleware", () => {
  return (req: any, res: any, next: any) => {
    req.user = { _id: "user123" }; // Mock authenticated user
    next();
  };
});
jest.mock("../../backend/logic/dashboardLogic.js");
  
  const app = express();
  app.use(express.json());
  app.use("/api", dashboardRouter);
  
  describe("Test GET /dashboard", () => {
    it("should return dashboard data for an authenticated user", async () => {
      const mockData = {
        todaySpending: 100,
        recentTransactions: [{ amount: 20, name: "Coffee", category: "Food" }],
        balance: 500,
        monthlySpending: [],
        transactions: []
      };
  
      getDashboardData.mockResolvedValue(mockData);
  
      const response = await request(app)
        .get("/api/dashboard")
        .set("Authorization", "Bearer mocktoken");
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(getDashboardData).toHaveBeenCalledWith("user123", "Bearer mocktoken");
    });
  
    it("should return 404 if user is not found", async () => {
      getDashboardData.mockResolvedValue({ error: "User not found" });
  
      const response = await request(app)
        .get("/api/dashboard")
        .set("Authorization", "Bearer mocktoken");
  
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "User not found" });
    });
  
    it("should return 500 if an error occurs", async () => {
      getDashboardData.mockRejectedValue(new Error("Database failure"));
  
      const response = await request(app)
        .get("/api/dashboard")
        .set("Authorization", "Bearer mocktoken");
  
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "Database failure" });
    });
  });