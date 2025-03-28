const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth.middleware');
const {Goal, SubGoal }  = require('../models/Goal.model');
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

// POST create a new goal - temporary test version without auth ---------Testing **************
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

 
    const authToken = req.headers.authorization;
    const goals = await getGoals(req.user._id, authToken); 

    console.log("Goals enroute: ", goals); 

    if (goals) {

      // res.json(JSON.stringify(goals)); 
      res.json(goals); 
    } else {
      res.json([]);
    }
    
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});


// Post creating a new goal
// Saving it Mongo DB
//  Sending the reponse back to frontend
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST request to create goal received');
    console.log('Request body:', req.body);
    console.log('User object from auth:', req.user);
    
    const { 
      title, 
      description, 
      targetAmount, 
      currentAmount, 
      targetDate, 
      category, 
      type, 
      selectedAccount, 
      limitAmount, 
      interval, 
      subGoals 
    } = req.body;

    
    // Basic validations...
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (targetAmount === undefined || targetAmount === null || targetAmount === '') {
      return res.status(400).json({ error: 'Target amount is required' });
    }
    // For Savings goals, targetDate must be provided.
    if (type === 'Savings' && !targetDate) {
      return res.status(400).json({ error: 'Target date is required' });
    }
    if (type === 'Spending Limit' && !category) {
      return res.status(400).json({ error: 'Category is required for spending goals' });
    }
    if (!req.user || !req.user._id) {
      return res.status(400).json({ error: 'User ID is missing from authentication' });
    }
    
    const getNextMonthDate = () => {
      const today = new Date();
      const nextMonthDate = new Date(today.setMonth(today.getMonth() + 1));
      return nextMonthDate;  // Return a Date object directly
    };

    // Build the new goal data object conditionally
    const newGoalData = {
      title, 
      description: description || '',
      targetAmount: Number(targetAmount),
      targetDate: new Date(getNextMonthDate()),
      currentAmount: currentAmount ? Number(currentAmount) : 0,
      type: type || 'Savings',
      selectedAccount: selectedAccount || undefined,
      userId: req.user._id,
      ...(type === 'Spending Limit' && {
        limitAmount,
        category,
        interval
      }),
      ...(type === 'Savings' && {
        subGoals: Array.isArray(subGoals) ? subGoals.map(subGoal => ({
          name: subGoal.name || '',
          goalAmount: subGoal.goalAmount ? Number(subGoal.goalAmount) : 0,
          currentAmount: 0

        })) : []
      })
    };


    const newGoal = new Goal(newGoalData);
    console.log('Goal to be saved:', {
      title: newGoal.title,
      targetAmount: newGoal.targetAmount,
      type: newGoal.type,
      category: newGoal.category,
      selectedAccount: newGoal.selectedAccount,
      limitAmount: newGoal.limitAmount,
      interval: newGoal.interval,
      subGoals: newGoal.subGoals,
      userId: newGoal.userId
    });

    
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
      selectedAccount: savedGoal.selectedAccount,
      limitAmount: savedGoal.limitAmount,
      interval: savedGoal.interval,
      subGoals: savedGoal.subGoals,
      createdAt: savedGoal.createdAt
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    
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
    const newGoal = new SubGoal({
      goalname: goalname ? String(goalname) : "",
      amount: currentAmount ? Number(currentAmount) : 0,

    });
    
    console.log('sub Goal to be saved:', {
      goalname: newGoal.goalname,
      amount: newGoal.amount,

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
      interval, 
      subGoals,
      selectedAccount, 
      limitAmount, 
      
      
    } = req.body;



    // Build update object with only provided fields
    const updateFields = {
      // title, 
      // description: description || '',
      // targetAmount: Number(targetAmount),
      // targetDate: new Date(getNextMonthDate()),
      // currentAmount: currentAmount ? Number(currentAmount) : 0,
      // type: type || 'Savings',
      // selectedAccount: selectedAccount || undefined,
      // userId: req.user._id,
      // ...(type === 'Spending Limit' && {
      //   limitAmount,
      //   category,
      //   interval
      // }),
      // ...(type === 'Savings' && {
      //   subGoals: Array.isArray(subGoals) ? subGoals.map(subGoal => ({
      //     name: subGoal.name || '',
      //     goalAmount: subGoal.goalAmount ? Number(subGoal.goalAmount) : 0,
      //     currentAmount: 0

      //   })) : []
      // })
    };

    // const newGoal = new Goal(newGoalData);
    // console.log('Goal to be saved:', {
    //   title: newGoal.title,
    //   targetAmount: newGoal.targetAmount,
    //   type: newGoal.type,
    //   category: newGoal.category,
    //   selectedAccount: newGoal.selectedAccount,
    //   limitAmount: newGoal.limitAmount,
    //   interval: newGoal.interval,
    //   subGoals: newGoal.subGoals,
    //   userId: newGoal.userId
    // });

    
    // const savedGoal = await newGoal.save();
    // console.log('Goal saved successfully with ID:', savedGoal._id);


    if (title) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (targetDate) updateFields.targetDate = new Date(targetDate);
    if (type) {
      updateFields.type = type;
      // Only update category if it's a spending goal
      if (type === 'Savings' && category) {
        updateFields.category = undefined;
      } else if (type === 'Spending Limit') {
        updateFields.category = category;
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
    if (selectedAccount && Array.isArray(selectedAccount)) {
      updateFields.selectedAccount = selectedAccount; // assuming accountIds is an array of account ids
    }

    // Update interval if provided
    if (interval !== undefined) {
      updateFields.interval = interval;
    }
    // Update limitAmount if provided 
    if (limitAmount !== undefined) {
      updateFields.limitAmount = Number(limitAmount);
    }

    console.log('Target amount:', targetAmount);
    console.log('subGoals:', subGoals);

    // Handle subgoals (if provided)
    if (subGoals && Array.isArray(subGoals)) {
      if (subGoals.length > 0) {
        const totalSubgoalAmount = subGoals.reduce((sum, subGoal) => sum + (subGoal.goalAmount || 0), 0);
    
        if (totalSubgoalAmount !== targetAmount) {
          return res.status(400).json({ error: 'Subgoal amounts do not sum up to the target amount' });
        }
      }
    
      updateFields.subGoals = subGoals.map((subGoal) => ({
        name: subGoal.name,
        goalAmount: Number(subGoal.goalAmount),
        currentAmount: subGoal.currentAmount || 0
      }));
    }

    updateFields.updatedAt = new Date();

    console.log('Update fields:', updateFields);
    console.log('User ID from token:', req.user._id);
    console.log('Goal ID to update:', req.params.id);
    
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
      selectedAccount: goal.selectedAccount, // Add accountIds to the response
      subGoals: goal.subGoals,     // Add subgoals to the response
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
    console.log('DELETE request to remove goal received');
    console.log('User object from auth:', req.user);
    console.log('Goal ID to delete:', req.params.id);
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