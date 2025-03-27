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

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'progress' | 'amount'>('date');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingMoneyToGoal, setAddingMoneyToGoal] = useState<Goal | null>(null);

  // Fetch goals from MongoDB when component mounts
  useEffect(() => {
  //   const fetchGoals = async () => {
  //     try {
  //       setIsLoading(true);
  //       setError(null);
    
  //       console.log('Fetching goals from API...');
  //       const response = await apiRequest('/goals', { requireAuth: true });
    
  //       // Log response for debugging
  //       // console.log('Raw response as text:', response.text);
  //       console.log('Raw response:', response);
  //       console.log('JSON.parse response:', JSON.parse(response));
    
  //       if (!response.ok) {
  //         console.error('Response not OK:', response.status, response.statusText);
  //         throw new Error(`API error: ${response.status} ${response.statusText}`);
  //       }
    
  //       const text = await response.text(); // Get raw response text
  //       console.log('Raw response text:', text);
    
  //       // Try to parse it as JSON
  //       const data = JSON.parse(text);
  //       console.log('Parsed JSON data:', data);
    
  //       setGoals(data.map((goal: any) => ({
  //         ...goal,
  //         targetDate: new Date(goal.targetDate),
  //       })));
  //     } catch (error) {
  //       console.error('Error fetching goals:', error);
  //       setError('Failed to load your goals. Please try again later.');
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  
  //   fetchGoals();
  // }, []);

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching goals from API...');
      // const response = await apiRequest('/goals', { requireAuth: true });
      const data = await apiRequest('/goals', { requireAuth: true });
      console.log('Parsed JSON data:', data);

      // Log response for debugging
    //  console.log('Raw response:', response);

      // if (!response.ok) {
      //   console.error('Response not OK:', response.status, response.statusText);
      //   throw new Error(API error: ${response.status} ${response.statusText});
      // }

      // const text = await response.text(); // Get raw response text
      // console.log('Raw response text:', text);

      // // Try to parse it as JSON
      // const data = JSON.parse(text);
      // console.log('Parsed JSON data:', data);

      setGoals(data.map((goal) => ({
        ...goal,
        targetDate: new Date(goal.targetDate),
      })));
    } catch (error) {
      console.error('Error fetching goals:', error);
      setError('Failed to load your goals. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Save a new goal to MongoDB
  const addGoal = async (formData: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Adding new goal, original form data:', formData);
      
      // Create the goal object with proper structure
      const newGoal = {
        title: formData.title,
        description: formData.description || "",
        targetAmount: Number(formData.targetAmount),
        currentAmount: Number(formData.currentAmount) || 0,
        targetDate: new Date(formData.targetDate),
        type: formData.type || "Savings",
        // Only include category for savings goals
        ...(formData.type === 'Savings' ? { category: formData.category } : {})
      };
      
      console.log('Formatted goal data to be sent:', newGoal);
      
      const savedGoal = await apiRequest<Goal>('/goals', {
        method: 'POST',
        body: newGoal,
        requireAuth: true
      });
      
      console.log('Goal saved successfully:', savedGoal);
      
      // Convert string date back to Date object
      savedGoal.targetDate = new Date(savedGoal.targetDate);
      
      setGoals([...goals, savedGoal]);
      setIsAddingGoal(false);  // Close the form
      setError('Goal created successfully!'); // Show success message
    } catch (error) {
      console.error('Error adding goal:', error);
      setError(`Failed to save your goal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a subgoal
  const addSubGoal = async (goalId: string, subGoalData: any) => {
    try {
      setIsLoading(true);
      setError(null);
  
      console.log("Adding sub-goal:", subGoalData);
  
      const updatedGoal = await apiRequest<Goal>(`/goals/${goalId}/subgoal`, {
        method: "POST",
        body: subGoalData,
        requireAuth: true,
      });
  
      setGoals(goals.map((goal) => (goal.id === goalId ? updatedGoal : goal)));
      setError("Sub-goal added successfully!");
    } catch (error) {
      console.error("Error adding sub-goal:", error);
      setError("Failed to add sub-goal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  

  // Delete a goal from MongoDB
  const deleteGoal = async (goalId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await apiRequest(`/goals/${goalId}`, {
        method: 'DELETE',
        requireAuth: true
      });

      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError('Failed to delete goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit a goal in MongoDB
  const editGoal = async (updatedGoal: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Updating goal with data:', updatedGoal);
      
      // Format the goal data for the API
      const goalToUpdate = {
        id: updatedGoal.id,
        title: updatedGoal.title,
        description: updatedGoal.description || "",
        targetAmount: Number(updatedGoal.targetAmount),
        currentAmount: Number(updatedGoal.currentAmount) || 0,
        targetDate: updatedGoal.targetDate instanceof Date 
          ? updatedGoal.targetDate.toISOString() 
          : new Date(updatedGoal.targetDate).toISOString(),
        category: updatedGoal.category || "Savings",
        type: updatedGoal.type || "Savings",
        spendingPeriod: updatedGoal.spendingPeriod
      };
      
      const savedGoal = await apiRequest<Goal>(`/goals/${updatedGoal.id}`, {
        method: 'PUT',
        body: goalToUpdate,
        requireAuth: true
      });
      
      savedGoal.targetDate = new Date(savedGoal.targetDate);
      
      setGoals(goals.map(g => g.id === savedGoal.id ? savedGoal : g));
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
        goal.id === goalId 
          ? { ...goal, currentAmount: goal.currentAmount + amount }
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
      case 'date':
        return a.targetDate.getTime() - b.targetDate.getTime();
      case 'progress':
        const progressA = calculateProgress(a.currentAmount, a.targetAmount);
        const progressB = calculateProgress(b.currentAmount, b.targetAmount);
        return progressB - progressA;
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
            <h1>Financial Goals</h1>
            <div>
              <button 
                className={styles.addButton}
                onClick={() => {
                  if (!isLoading) { // Check if already loading to prevent unnecessary re-renders
                    setIsAddingGoal(true);
                  }
                }}
                disabled={isLoading}
              >
                Add New Goal
              </button>
            </div>
          </div>

          <div className={styles.controls}>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.sortSelect}
              disabled={isLoading || goals.length === 0}
            >
              <option value="date">Sort by Date</option>
              <option value="progress">Sort by Progress</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>

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
                sortedGoals.map((goal) => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={() => setEditingGoal(goal)} 
                    onDelete={() => deleteGoal(goal.id)}
                    onViewDetails={() => setSelectedGoal(goal)}
                    onAddMoney={() => setAddingMoneyToGoal(goal)}
                  />
                ))
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

      {editingGoal && (
        <GoalForm 
          initialGoal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={(updatedGoal) => {
            // Include the ID from the editing goal
            editGoal({...updatedGoal, id: editingGoal.id});
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