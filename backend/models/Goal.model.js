const mongoose = require('mongoose');

const savingSubGoalSchema = new mongoose.Schema({
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,  // Ensure that a goalId is provided
    ref: 'Goal'  // You can use the 'Goal' model to reference it
  },
  name: {
    type: String,
    required: true,  // Ensure that a name is provided
  },
  amount: {
    type: Number,
    required: true,  // Ensure that an amount is provided
    min: 0  // Ensure that amount is a positive number
  },
  percent: {
    type: Number,
    required: true,  // Ensure that a percentage is provided
    min: 0,
    max: 100  // Ensure percentage is between 0 and 100
  }
}, {
  timestamps: true // Optionally, to automatically add createdAt and updatedAt
});

const goalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: [0, 'Target amount cannot be negative']
  },
  currentAmount: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Current amount cannot be negative'],
    validate: {
      validator: function(v) {
        return v <= this.targetAmount;
      },
      message: 'Current amount cannot exceed target amount'
    }
  },
  targetDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Target date must be in the future'
    }
  },
  category: {
    type: String,
    required: function() {
      return this.type === 'Savings';
    }
  },
  type: {
    type: String,
    enum: ['Savings', 'Spending Limit'],
    default: 'Savings'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  accountId: [{
    type: mongoose.Schema.Types.ObjectId,
    
  }],  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }, 
  savingSubGoals: {
    goals: [savingSubGoalSchema]
  }
});



const Goal = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
const SubSavingGoal = mongoose.models.SubSavingGoal || mongoose.model('SubSavingGoal', savingSubGoalSchema);

module.exports = {Goal, SubSavingGoal};