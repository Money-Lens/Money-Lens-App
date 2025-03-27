const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth.middleware');
const {Goal, SubSavingGoal }  = require('../models/Goal.model');
const { getGoals, getGoal, getTotalSpendingForGoals, getSpendingForGoals, addSubGoalToGoal, getTotalSavingsForGoals } = require('../logic/goalsLogic')


// Test endpoint - no auth required
router.get('/test', (req, res) => {
  res.json({ message: 'Goals API is working!' });
});

// Debug endpoint to check auth - auth required
router.get('/auth-check', auth, (req, res) => {
  res.json({
    message: 'Auth is working correctly',
    user: req.user
  });
});

// POST create a new goal - temporary test version without auth
router.post('/test-create', async (req, res) => {
  try {
    console.log('POST test-create endpoint hit');
    console.log('Request body:', req.body);
    
    // Use a test user ID - replace with a valid ObjectId from your database
    const testUserId = req.headers['x-test-user-id'] || '65fc123456789abcdef12345';
    
    if (!mongoose.Types.ObjectId.isValid(testUserId)) {
      return res.status(400).json({ error: 'Invalid test user ID format' });
    }
    
    const { title, description, targetAmount, currentAmount, targetDate, category, type } = req.body;
    
    const newGoal = new Goal({
      title: title || 'Test Goal',
      description: description || 'Test Description',
      targetAmount: Number(targetAmount) || 1000,
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      targetDate: targetDate || new Date(),
      category: type === 'Savings' ? (category || 'Test') : undefined,
      type: type || 'Savings',
      userId: testUserId
    });
    
    console.log('Goal to be saved:', newGoal);
    
    const savedGoal = await newGoal.save();
    console.log('Goal saved successfully with ID:', savedGoal._id);
    
    res.status(201).json({
      id: savedGoal._id.toString(),
      title: savedGoal.title,
      description: savedGoal.description,
      targetAmount: savedGoal.targetAmount,
      currentAmount: savedGoal.currentAmount,
      targetDate: savedGoal.targetDate,
      category: savedGoal.category,
      type: savedGoal.type,
      createdAt: savedGoal.createdAt
    });
  } catch (error) {
    console.error('Error in test-create:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null
    });
  }
});

// GET all goals for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    console.log('Goals GET request received');
    console.log('User ID from token:', req.user._id);
    console.log('User ID ? from token:', req.user?._id);

    // const goals = await Goal.find({ userId: req.user._id });

    // const goals = await apiRequest<GoalsResponse>('/goals', {
    //   method: 'GET',
    //   requireAuth: true, // Make sure the token is included in the request
    // });
    const authToken = req.headers.authorization;
    const goals = await getGoals(req.user._id, authToken); 

    console.log("Goals enroute: ", goals); 

    if (goals) {
      // console.log(`Found ${goals.length} goals for user`);
    
      // // Transform _id to id for frontend compatibility
      // const transformedGoals = goals.map(goal => ({
      //   id: goal._id.toString(),
      //   title: goal.title,
      //   description: goal.description,
      //   targetAmount: goal.targetAmount,
      //   currentAmount: goal.currentAmount,
      //   targetDate: goal.targetDate,
      //   category: goal.category,
      //   type: goal.type,
      //   userId: goal.userId, 
      //   accountId: goal.accountId || [], 
      //   createdAt: goal.createdAt,
      //   updatedAt: goal.updatedAt, 
      //   savingSubGoals: goal.savingSubGoals || []
      // }));
      
      // res.json(transformedGoals);

      // res.json(JSON.stringify(goals)); 
      res.json(goals); 
    } else {
      res.json();
    }
    
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// POST create a new goal
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST request to create goal received');
    console.log('Request body:', req.body);
    console.log('User object from auth:', req.user);
    
    // Validate that all required fields are present
    const { title, description, targetAmount, currentAmount, targetDate, category, type } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!targetAmount) {
      return res.status(400).json({ error: 'Target amount is required' });
    }
    
    if (!targetDate) {
      return res.status(400).json({ error: 'Target date is required' });
    }
    
    if (type === 'Savings' && !category) {
      return res.status(400).json({ error: 'Category is required for savings goals' });
    }
    
    if (!req.user || !req.user._id) {
      return res.status(400).json({ error: 'User ID is missing from authentication' });
    }
    
    // Create the new goal
    const newGoal = new Goal({
      title,
      description: description || '',
      targetAmount: Number(targetAmount),
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      targetDate: new Date(targetDate),
      category: type === 'Savings' ? category : undefined,
      accountid: [], 
      type: type || 'Savings',
      userId: req.user._id,
      createdAt: new Date(), 
      savingSubGoals: []
    });
    
    console.log('Goal to be saved:', {
      title: newGoal.title,
      targetAmount: newGoal.targetAmount,
      type: newGoal.type,
      category: newGoal.category,
      userId: newGoal.userId
    });
    
    // Save to database
    const savedGoal = await newGoal.save();
    console.log('Goal saved successfully with ID:', savedGoal._id);
    
    // Return the created goal
    res.status(201).json({
      id: savedGoal._id.toString(),
      title: savedGoal.title,
      description: savedGoal.description,
      targetAmount: savedGoal.targetAmount,
      currentAmount: savedGoal.currentAmount,
      targetDate: savedGoal.targetDate,
      category: savedGoal.category,
      type: savedGoal.type,
      createdAt: savedGoal.createdAt
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors 
      });
    }
    
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});


// POST create a new sub goal
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST request to create subgoal received');
    console.log('Request body:', req.body);
    console.log('User object from auth:', req.user);

    
    if (!req.user || !req.user._id) {
      return res.status(400).json({ error: 'User ID is missing from authentication' });
    }
    
    // Create the new sub goal
    const newGoal = new SubSavingGoal({
      goalname: goalname ? String(goalname) : "",
      amount: currentAmount ? Number(currentAmount) : 0,
      percent: percent ? Number(percent) : 0
    });
    
    console.log('sub Goal to be saved:', {
      goalname: newGoal.goalname,
      amount: newGoal.amount,
      percent: newGoal.percent
    });
    
    // Save to database
    const savedGoal = await newGoal.save();
    console.log('subGoal saved successfully with ID:', savedGoal._id);
    
    // Return the created goal
    res.status(201).json({
      id: savedGoal._id.toString(),
      goalname: savedGoal.goalname,
      amount: savedGoal.amount,
      percent: savedGoal.percent
    });
  } catch (error) {
    console.error('Error creating subgoal:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors 
      });
    }
    
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});


// GET a specific goal
router.get('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ 
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      category: goal.category,
      type: goal.type,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// PUT update a goal
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      targetAmount, 
      currentAmount, 
      targetDate, 
      category, 
      type, 
      accountIds, 
      subgoals 
    } = req.body;

    // Build update object with only provided fields
    const updateFields = {};

    if (title) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (targetDate) updateFields.targetDate = new Date(targetDate);
    if (type) {
      updateFields.type = type;
      // Only update category if it's a savings goal
      if (type === 'Savings' && category) {
        updateFields.category = category;
      } else if (type === 'Spending Limit') {
        updateFields.category = undefined;
      }
    }
    
    // Handle targetAmount and currentAmount updates together
    if (targetAmount !== undefined) {
      updateFields.targetAmount = Number(targetAmount);
    }
    if (currentAmount !== undefined) {
      updateFields.currentAmount = Number(currentAmount);
    }

    // Update accountIds if provided
    if (accountIds && Array.isArray(accountIds)) {
      updateFields.accountIds = accountIds; // assuming accountIds is an array of account ids
    }

    // Handle subgoals (if provided)
    if (subgoals && Array.isArray(subgoals)) {
      // Validate subgoals before updating
      const totalSubgoalAmount = subgoals.reduce((sum, subgoal) => sum + (subgoal.amount || 0), 0);
      
      // Ensure the subgoal amounts sum up to the targetAmount
      if (totalSubgoalAmount !== targetAmount) {
        return res.status(400).json({ error: 'Subgoal amounts do not sum up to the target amount' });
      }

      // Add subgoals to the update object
      updateFields.subgoals = subgoals.map((subgoal) => ({
        name: subgoal.name,
        amount: Number(subgoal.amount),
        percentage: subgoal.percentage
      }));
    }

    updateFields.updatedAt = new Date();
    
    // Find and update the goal
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { 
        new: true, 
        runValidators: true,
        context: 'query' // This ensures validators have access to the full document
      }
    );
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found or you do not have permission' });
    }
    
    res.json({
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      category: goal.category,
      type: goal.type,
      accountIds: goal.accountIds, // Add accountIds to the response
      subgoals: goal.subgoals,     // Add subgoals to the response
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors 
      });
    }
    
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});


// Add a sub-goal to a goal
router.post("/:goalId/subgoal", async (req, res) => {
  try {
    const { goalId } = req.params;
    const { title, targetAmount } = req.body;

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const newSubGoal = {
      title,
      targetAmount,
      currentAmount: 0,
      completed: false,
    };

    goal.subGoals.push(newSubGoal);
    await goal.save();

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: "Error adding sub-goal", error });
  }
});


// DELETE a goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ 
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found or you do not have permission' });
    }
    
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// PATCH add money to a goal
router.patch('/:id/add-money', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        $inc: { currentAmount: Number(amount) },
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found or you do not have permission' });
    }
    
    res.json({
      id: goal._id.toString(),
      title: goal.title,
      description: goal.description,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      category: goal.category,
      type: goal.type,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    });
  } catch (error) {
    console.error('Error adding money to goal:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

module.exports = router;