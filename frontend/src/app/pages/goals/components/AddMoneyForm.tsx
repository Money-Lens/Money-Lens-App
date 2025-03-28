'use client';
import React, { useState } from 'react';
import { Goal } from '../../../assets/utilities/API_HANDLER';
import {
  Box,
  Button,
  Dialog,
  TextField,
  Typography,
  FormHelperText,
} from '@mui/material';

interface AddMoneyFormProps {
  goal: Goal;
  onClose: () => void;
  onSubmit: (goalId: string, amount: number) => void;
}

export default function AddMoneyForm({ goal, onClose, onSubmit }: AddMoneyFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onSubmit(goal._id || goal.id, numAmount);
      onClose();
    } else {
      setError('Please enter a valid amount greater than 0.');
    }
  };

  const isValidAmount = () => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit} p={3}>
        <Typography variant="h6" mb={2}>
          Add Money to {goal.title}
        </Typography>

        <TextField
          fullWidth
          label="Amount"
          type="number"
          inputProps={{ min: 0, step: 0.01 }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          size="small"
          error={!!error}
          sx={{ mb: 2 }}
        />

        {error && (
          <FormHelperText error sx={{ mb: 2 }}>
            {error}
          </FormHelperText>
        )}

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={!isValidAmount()}
          >
            Add Money
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
