'use client';
import React from 'react';
import { Goal } from '../../../types/goals';
import {
  Dialog,
  Box,
  Typography,
  Button,
  LinearProgress,
  Grid,
} from '@mui/material';

interface GoalDetailsProps {
  goal: Goal;
  onClose: () => void;
}

const getPeriodDays = (interval: string, targetDate?: Date) => {
  switch (interval) {
    case 'Daily': return 1;
    case 'Weekly': return 7;
    case 'Monthly': return 30;
    case 'Annually': return 365;
    case 'Date': {
      if (!targetDate) return 1;
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
    }
    default: return 1;
  }
};

export default function GoalDetails({ goal, onClose }: GoalDetailsProps) {
  const isSpending = goal.type === 'Spending Limit';

  const limit = isSpending ? goal.limitAmount : goal.targetAmount;
  const progress = limit > 0 ? Math.min((goal.currentAmount / limit) * 100, 100) : 0;

  const periodDays = getPeriodDays(goal.interval, new Date(goal.targetDate));
  const budgetRemaining = isSpending ? goal.limitAmount - goal.currentAmount : goal.targetAmount - goal.currentAmount;
  const dailyRate = budgetRemaining / periodDays;

  const timeRemainingText = (() => {
    if (!goal.targetDate) return 'N/A';
    const diff = new Date(goal.targetDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`;
  })();

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          {goal.title}
        </Typography>

        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom>
            {isSpending ? 'Spending Progress' : 'Savings Progress'}
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
          <Typography variant="body2" mt={1}>
            {isSpending ? 'Spent' : 'Saved'}: ${goal.currentAmount.toLocaleString()} / ${limit.toLocaleString()}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {isSpending && (
            <>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Budget Remaining</Typography>
                <Typography>${budgetRemaining.toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Interval</Typography>
                <Typography>{goal.interval}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Max Daily Spending</Typography>
                <Typography>${dailyRate.toFixed(2)}</Typography>
              </Grid>
            </>
          )}

          {!isSpending && (
            <>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Time Remaining</Typography>
                <Typography>{timeRemainingText}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Daily Savings Needed</Typography>
                <Typography>${dailyRate.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Amount Left to Save</Typography>
                <Typography>${Math.max(0, budgetRemaining).toLocaleString()}</Typography>
              </Grid>
            </>
          )}
        </Grid>

        <Box display="flex" justifyContent="flex-end" mt={4}>
          <Button variant="outlined" onClick={onClose} size="small">
            Close
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
