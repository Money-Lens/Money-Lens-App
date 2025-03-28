'use client';

import React, { useState, useEffect } from 'react';
import styles from './goals.module.css';
import pageStyles from '../../assets/page.module.css';
import GoalCard from './components/GoalCard';
import GoalForm from './components/GoalForm';
import { Goal, apiRequest } from '../../assets/utilities/API_HANDLER';
import GoalDetails from './components/GoalDetails';
import Card from '../../components/Card';
import AddMoneyForm from './components/AddMoneyForm';
import { ObjectId } from 'mongodb';
import { TextField, Button, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel } from '@mui/material';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'progress' | 'amount'>('date');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMoneyToGoal, setAddingMoneyToGoal] = useState<Goal | null>(null);




  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      setError(null);
     const data = await apiRequest('/goals', { requireAuth: true });
     console.log("goal data: ", data); 
 
     const goals = data.goals || []; 
 
     const normalizedGoals = goals.map(g => ({
      ...g,
      _id: g._id || g.id,
    }));
    setGoals(normalizedGoals);
   } catch (error) {
     console.error('Error fetching goals:', error);
     setError('Failed to load your goals. Please try again later.');
   } finally {
     setIsLoading(false);
   }
 };

  useEffect(() => {

  

fetchGoals();
}, []);



  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const calculateTimeRemaining = (targetDate: Date) => {
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days remaining` : 'Past due';
  };

  // Adding new goal based on the two different goal forms saving and spending limit
  // saving new goal to mongo db 
  //
  const addGoal = async (formData: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Adding new goal, original form data:', formData);
      
      // Build the new goal object conditionally
      const newGoal = {
        title: formData.title,
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount) || 0,
        selectedAccount: formData.selectedAccount || null,
        type: formData.type || "Savings",
        ...(formData.type === 'Savings' ? { 
              subGoals: formData.subGoals.map((subGoal: any, index: number) => ({
                name: subGoal.name || editingGoal?.subGoals[index]?.name,
                goalAmount: Number(subGoal.amount ?? subGoal.goalAmount ?? 0),
                currentAmount: Number(subGoal.currentAmount ?? 0),
              })),
              targetDate: new Date(formData.targetDate),
        } : {
              limitAmount: Number(formData.limitAmount),
              interval: formData.interval || "Monthly", 
              ...(formData.interval === "Date" ? {
                targetDate: new Date(formData.targetDate)
              } : {
                targetDate: new Date()
              }),
              category: formData.category || "",
        })
      };

      
      
      console.log('Formatted goal data to be sent:', newGoal);
      
      const savedGoal = await apiRequest<Goal>('/goals', {
        method: 'POST',
        body: newGoal,
        requireAuth: true
      });
      
      console.log('Goal saved successfully:', savedGoal);
      
      // If needed, convert targetDate back to Date object
      if (savedGoal.targetDate) {
        savedGoal.targetDate = new Date(savedGoal.targetDate);
      }

      if (savedGoal.id) {
        savedGoal._id = savedGoal.id;
      }
      
      setGoals([...goals, savedGoal]);
      setIsAddingGoal(false);
      setError('Goal created successfully!');
    } catch (error) {
      console.error('Error adding goal:', error);
      setError(`Failed to save your goal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // // Add a subgoal
  // const addSubGoal = async (goalId: string, subGoalData: any) => {
  //   try {
  //     setIsLoading(true);
  //     setError(null);
  
  //     console.log("Adding sub-goal:", subGoalData);
  
  //     const updatedGoal = await apiRequest<Goal>(`/goals/${goalId}/subgoal`, {
  //       method: "POST",
  //       body: subGoalData,
  //       requireAuth: true,
  //     });
  
  //     setGoals(goals.map((goal) => (goal.id === goalId ? updatedGoal : goal)));
  //     setError("Sub-goal added successfully!");
  //   } catch (error) {
  //     console.error("Error adding sub-goal:", error);
  //     setError("Failed to add sub-goal. Please try again.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  

  // Delete a goal from MongoDB
  const deleteGoal = async (goalId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiRequest(`/goals/${goalId}`, {
        method: 'DELETE',
        requireAuth: true
      });

      setGoals(goals.filter(g => g._id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextMonthDate = () => {
    const today = new Date();
    const nextMonthDate = new Date(today.setMonth(today.getMonth() + 1));
    return nextMonthDate;  // Return a Date object directly
  };

  // Edit a goal in MongoDB
  const editGoal = async (updatedGoal: any, goalId: string) => {
    try {
      setIsLoading(true);
      setError(null);
  
      const goalToUpdate = {
        ...updatedGoal,
        targetDate: updatedGoal.targetDate instanceof Date
          ? updatedGoal.targetDate.toISOString()
          : new Date(getNextMonthDate()).toISOString(),
        ...(updatedGoal.subGoals && {
          subGoals: updatedGoal.subGoals.map((subGoal: any) => ({
            name: subGoal.name,
            goalAmount: Number(subGoal.amount ?? subGoal.goalAmount ?? 0),
            currentAmount: Number(subGoal.currentAmount ?? 0),
          }))
        })
      };
      
  
      const savedGoal = await apiRequest<Goal>(`/goals/${goalId}`, {
        method: 'PUT',
        body: goalToUpdate,
        requireAuth: true
      });
  
      savedGoal.targetDate = new Date(savedGoal.targetDate);
  
      setGoals(goals.map(g => g._id === savedGoal._id ? savedGoal : g));
      fetchGoals();
      setEditingGoal(null);
      setError('Goal updated successfully!');
    } catch (error) {
      console.error('Error updating goal:', error);
      setError('Failed to update your goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  

  // Add new function to handle money addition
  const addMoneyToGoal = async (goalId: string, amount: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedGoal = await apiRequest<Goal>(`/goals/${goalId}/add-money`, {
        method: 'PATCH',
        body: { amount },
        requireAuth: true
      });

      // Update the goals list with the new amount
      setGoals(goals.map(goal =>
        (goal._id || goal.id) === goalId
          ? { ...goal, ...updatedGoal }
          : goal
      ));

      setError('Money added successfully!');
    } catch (error) {
      console.error('Error adding money to goal:', error);
      setError('Failed to add money to goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sort goals based on the selected criteria

  const sortedGoals = [...goals].sort((a, b) => {
    switch (sortBy) {
      case 'date': {
        const aTime = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
        const bTime = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
        return aTime - bTime;
      }
      case 'progress': {
        const progressA = calculateProgress(a.currentAmount, a.targetAmount);
        const progressB = calculateProgress(b.currentAmount, b.targetAmount);
        return progressB - progressA;
      }
      case 'amount':
        return b.targetAmount - a.targetAmount;
      default:
        return 0;
    }
  });
  

  return (
    <div className={pageStyles.dashboard}>
      <Card className={pageStyles.fullPageCard}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2>Financial Goals</h2>
            <div>
              <Button 
                variant="contained"
                color="primary"
                onClick={() => {
                  if (!isLoading) {
                    setIsAddingGoal(true);
                  }
                }}
                disabled={isLoading}
              >
                Add New Goal
              </Button>
            </div>
          </div>

          {goals.length > 0 && (
          <div className={styles.controls}>
            <FormControl sx={{ minWidth: 180, paddingBottom: 2 }}>
              <InputLabel id="sort-by-label">Sort By</InputLabel>
              <Select
                labelId="sort-by-label"
                id="sort-by"
                size='small'
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as any)}
                disabled={isLoading}
              >
                <MenuItem value="date">Sort by Date</MenuItem>
                <MenuItem value="progress">Sort by Progress</MenuItem>
                <MenuItem value="amount">Sort by Amount</MenuItem>
              </Select>
            </FormControl>
          </div>
        )}

          {error && <div className={styles.errorMessage}>{error}</div>}
          
          {isLoading ? (
            <div className={styles.loadingMessage}>Loading your goals...</div>
          ) : (
            <div className={styles.goalsGrid}>
              {sortedGoals.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>You don't have any financial goals yet.</p>
                  <p>Click "Add New Goal" to start tracking your financial targets!</p>
                </div>
              ) : (
                sortedGoals.map((goal) => {
                  console.log("Goal ID:", goal._id); // Log to see the goal._id value
                  return (
                    <GoalCard 
                    key={goal.id || goal._id}
                      goal={goal} 
                      onEdit={(goal) => setEditingGoal(goal)}
                      onDelete={() => deleteGoal(goal._id || goal.id)}
                      onViewDetails={() => setSelectedGoal(goal)}
                      onAddMoney={() => setAddingMoneyToGoal(goal)}
                    />
                  )})
              )}

            </div>
          )}
        </div>
      </Card>

      {isAddingGoal && (
        <GoalForm 
          onClose={() => setIsAddingGoal(false)}
          onSubmit={addGoal}
        />
      )}

      {selectedGoal && !editingGoal && (
        <GoalDetails 
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
        />
      )}

      {editingGoal && editingGoal._id && (
        <GoalForm 
          initialGoal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={(updatedGoal) => {
            editGoal(updatedGoal, editingGoal._id || editingGoal.id);
          }}
        />
      )}

      {addingMoneyToGoal && (
        <AddMoneyForm
          goal={addingMoneyToGoal}
          onClose={() => setAddingMoneyToGoal(null)}
          onSubmit={addMoneyToGoal}
        />
      )}
    </div>
  );
}