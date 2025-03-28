'use client';
import React, { useEffect, useState } from 'react';
import { Goal } from '../../../types/goals';
import { apiRequest } from '../../../assets/utilities/API_HANDLER';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  LinearProgress,
  Button,
  Collapse,
  Box,
  Divider
} from '@mui/material';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onAddMoney: (goal: Goal) => void;
}

const calculateTimeRemaining = (targetDate?: Date) => {
  if (!targetDate) return { days: 0, isPastDue: false };
  const now = new Date();
  const diffTime = new Date(targetDate).getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return { days: diffDays, isPastDue: diffDays <= 0 };
};

export default function GoalCard({ goal, onEdit, onDelete, onViewDetails, onAddMoney }: GoalCardProps) {
  const isSpendingLimit = goal.type === 'Spending Limit';
  const isSavings = goal.type === 'Savings';
  const [progress, setProgress] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await apiRequest('/accounts', { requireAuth: true });
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (isSpendingLimit) {
      setProgress(Math.min((goal.currentAmount / goal.limitAmount) * 100, 100));
    } else {
      setProgress(Math.min((goal.currentAmount / goal.targetAmount) * 100, 100));
    }
  }, [goal]);

  const account = accounts.find(acc => acc._id === goal.selectedAccount) || { name: 'N/A' };
  const { days, isPastDue } = calculateTimeRemaining(new Date(goal.targetDate));
  const timeRemainingText = isPastDue
    ? `${Math.abs(days)} days overdue`
    : `${days} days remaining`;

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {isSpendingLimit ? 'Spending Limit' : 'Savings Goal'}: {goal.title}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {isSpendingLimit
            ? `Spent: $${goal.currentAmount.toLocaleString()} / $${goal.limitAmount.toLocaleString()}`
            : `Progress: $${goal.currentAmount.toLocaleString()} / $${goal.targetAmount.toLocaleString()}`
          }
        </Typography>

        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 1, mb: 2, height: 8, borderRadius: 5 }}
        />

        <Typography variant="body2">Account: {account.name}</Typography>
        {isSpendingLimit && <Typography variant="body2">Category: {goal.category}</Typography>}
        <Typography variant="body2">{timeRemainingText}</Typography>

        {isSavings && goal.subGoals?.length > 0 && (
          <>
            <Button size="small" onClick={() => setExpanded(prev => !prev)}>
              {expanded ? 'Hide Sub-goals ▲' : 'Show Sub-goals ▼'}
            </Button>
            <Collapse in={expanded}>
              <Box sx={{ mt: 1 }}>
                {goal.subGoals.map(subGoal => (
                  <Box key={subGoal._id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{subGoal.name}</Typography>
                    <Typography variant="body2">
                      ${subGoal.currentAmount.toLocaleString()} / ${subGoal.goalAmount.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </>
        )}
      </CardContent>

      <Divider />

      <CardActions sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
        <Box>
          <Button onClick={onViewDetails} size="small">Details</Button>
          <Button onClick={() => onEdit(goal)} size="small">Edit</Button>
          <Button onClick={onDelete} size="small" color="error">Delete</Button>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={() => onAddMoney(goal)}
        >
          {isSpendingLimit ? 'Add Spending' : 'Add Money'}
        </Button>
      </CardActions>
    </Card>
  );
}
