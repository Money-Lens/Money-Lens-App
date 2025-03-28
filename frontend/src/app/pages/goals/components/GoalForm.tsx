
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../assets/utilities/API_HANDLER';
import styles from '../goals.module.css';
import {
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Box,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';


export default function GoalForm({ onClose, onSubmit, initialGoal: initialGoalProp }) {
  
  const getNextMonthDate = () => {
    const today = new Date();
    const nextMonthDate = new Date(today.setMonth(today.getMonth() + 1));
    return nextMonthDate;  // Return a Date object directly
  };

  
  // Define default values
  const defaultInitialGoal = {
    type: 'Savings',
    title: '',
    targetAmount: '',
    selectedAccount: '',
    targetDate: getNextMonthDate(),
    limitAmount: '0',
    category: '',
    interval: 'Daily',
    subGoals: [], 
  };
  const initialGoal = initialGoalProp || defaultInitialGoal;

  
  // Use strings for numeric fields so they can be cleared.
  const [type, setType] = useState(initialGoal?.type || 'Savings');
  const [accounts, setAccounts] = useState([]);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [subGoals, setSubGoals] = useState(
    initialGoal?.subGoals?.map((sg) => ({
      name: sg.name || '',
      amount: sg.goalAmount ?? 0,
      currentAmount: sg.currentAmount ?? 0,
    })) || []
  );  
  const [goalName, setGoalName] = useState(initialGoal?.title || "");
  const [goalAmount, setGoalAmount] = useState(initialGoal?.targetAmount ?? '');
  const [limitAmount, setLimitAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [targetDate, setTargetDate] = useState(
    initialGoal?.targetDate ? new Date(initialGoal.targetDate) : getNextMonthDate()
  );  
  const [interval, setInterval] = useState('Daily');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state  const [isAddingGoal, setIsAddingGoal] = useState(false); 
  const [subGoalAmount, setSubGoalAmount] = useState(); 
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isMatchingTotals, setMatchingTotals] = useState(true); // State to track if sub-goal amounts match the total goal amount

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        console.log('Fetching accounts...');
        const data = await apiRequest('/accounts', { requireAuth: true });
    
        console.log('Raw response:', data);
    
        if (Array.isArray(data.accounts)) {
          setAccounts(data.accounts);
          // Set default selected account if necessary, e.g., first account:
          if (data.accounts.length > 0) {
            setAccounts(data.accounts);
          
            // If editing, match account by ID
            if (initialGoalProp?.selectedAccount) {
              const match = data.accounts.find(
                (acc) => acc._id === initialGoalProp.selectedAccount
              );
              setSelectedAccount(match || data.accounts[0]); // fallback to first if not found
            } else {
              setSelectedAccount(data.accounts[0]); // default if adding
            }
          }
        } else {
          console.error('Unexpected response format:', data);
          setAccounts([]);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        setAccounts([]);
      }
    };


    // Fetch unique categories for the filter dropdown
    const fetchAvailableCategories = async () => {
      try {
        const response = await apiRequest('/transactions/categories');
        setAvailableCategories(response.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchAccounts();
    fetchAvailableCategories(); 
  }, []);  // Runs once when the component mounts

  


  // Add a new sub-goal with a unique id
  const addSubGoal = () => {
    setSubGoals([
      ...subGoals,
      { name: '', goalAmount: 0, currentAmount: 0 }  // Initialize with the correct default fields
    ]);
  };
  

  const removeSubGoal = (index) => {
    setSubGoals(subGoals.filter((_, i) => i !== index));
  };

  const checkMatchingTotals = () => {
    const totalSubGoalAmount = subGoals.reduce(
      (sum, sg) => sum + (parseFloat(sg.amount) || 0), // Ensure proper handling of numbers
      0
    );
    const totalGoalAmount = parseFloat(goalAmount) || 0; // Ensure goalAmount is a number
    console.log('Total Sub-Goal Amount:', totalSubGoalAmount);
    console.log('Total Goal Amount:', totalGoalAmount);
    setMatchingTotals(totalSubGoalAmount === totalGoalAmount);
    console.log('Matching Totals:', isMatchingTotals);
    if (subGoals.length > 0 && totalSubGoalAmount !== totalGoalAmount) {
      setError('Sub-goal amounts must match the total goal amount.');
    } else {
      setError(null);
    }
  };
  useEffect(() => {
    checkMatchingTotals();
  }, [goalAmount, subGoals]); // Check whenever goalAmount or subGoals change 

  // Update a sub-goal field.
  const handleSubGoalChange = (index, field, value) => {
    const newSubGoals = [...subGoals];
    if (field === 'amount') {
      newSubGoals[index]['amount'] = parseFloat(value) || 0; // Update 'amount' instead of 'goalAmount'
    } else {
      newSubGoals[index][field] = value;
    }
    setSubGoals(newSubGoals);
    checkMatchingTotals(); // Check if totals match after updating
  };

  // Update goal type and reset related fields.
  const handleTypeChange = (e) => {
    setType(e.target.value);
    setSubGoals([{ name: '', amount: 0 }]);  // Use number instead of string
    setTargetAmount(0);
    setLimitAmount(0);
  };

  const handleSubGoalAmountChange = () => {
    const totalSubGoalAmount = subGoals.reduce(
      (sum, sg) => sum + (parseFloat(sg.amount) || 0), // Ensure proper handling of numbers
      0
    );
    if (totalSubGoalAmount > parseFloat(goalAmount)) {
      setError('Sub-goal amounts cannot exceed total goal amount.');
    } else {
      setError(null);
    }
  };
  

  

  const handleGoalTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value);
  };
  

  const validateSubGoals = () => {
    return subGoals.every((subGoal) => subGoal.name && subGoal.goalAmount >= 0 && subGoal.currentAmount >= 0);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
  
    try {
      // Build the goal data object conditionally

  //     if (!validateSubGoals()) {
  //   setError("All sub-goals must have a name, goal amount, and current amount.");
  //   return;
  // }

      console.log("trying to submit form"); 
      const goalData = {
        title: goalName || "",
        targetAmount: parseFloat(goalAmount) || 0,
        currentAmount: 0,
        selectedAccount: selectedAccount || null,
        type: type || "Savings", 

        // Only include targetDate and category for Savings goals
        ...(type === 'Savings' ? { 
            targetDate: targetDate || getNextMonthDate(),  // targetDate is already in YYYY-MM-DD format
            subGoals: subGoals.map((sg) => ({
              ...sg,
              name: sg.name,
              amount: sg.amount,
              currentAmount: 0
              
            })),
        } : {
          category: category || "", 
          limitAmount: limitAmount || 0,
          interval: interval || "Monthly",
          ...(interval === "Date" ? {
            targetDate: targetDate || getNextMonthDate(), 
          } : {
            targetDate: getNextMonthDate(),
          })
        })
      };

      console.log("trying to submit form", goalData);
  
      await onSubmit(goalData);
      onClose();
    } catch (error) {
      setError('Failed to create goal.');
    } finally {
      setIsLoading(false);
    }
  };




  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <Typography variant="h5" gutterBottom>
          {initialGoalProp ? 'Edit Goal' : 'Add New Goal'}
        </Typography>
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel id="goal-type-label">Goal Type</InputLabel>
            <Select
              labelId="goal-type-label"
              id="goalType"
              value={type}
              label="Goal Type"
              onChange={handleTypeChange}
            >
              <MenuItem value="Savings">Savings</MenuItem>
            </Select>
          </FormControl>
  
          <TextField
            fullWidth
            id="goalName"
            label="Goal Name"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            required
            sx={{ mb: 2 }}
            size="small"
          />
  
          <TextField
            fullWidth
            id="goalAmount"
            label="Goal Amount"
            type="number"
            value={goalAmount}
            onChange={(e) => {
              const value = e.target.value;
              setGoalAmount(value === '' ? '' : Number(value));
            }}
            required
            sx={{ mb: 2 }}
            size="small"
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Target Date"
              value={targetDate ? dayjs(targetDate) : null}
              onChange={(newValue) => {
                setTargetDate(newValue ? newValue.toDate() : null);
              }}
              minDate={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  size: 'small',
                  sx: { mb: 2 },
                },
              }}
            />
          </LocalizationProvider>

  
          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel id="account-label">Account</InputLabel>
            <Select
              labelId="account-label"
              id="selectedAccount"
              value={selectedAccount ? selectedAccount._id : ''}
              label="Account"
              onChange={(e) => {
                const selected = accounts.find(
                  (acc) => acc._id === e.target.value
                );
                setSelectedAccount(selected);
              }}
              required
            >
              {accounts.map((account) => (
                <MenuItem key={account._id} value={account._id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
  
          <Typography variant="h6" sx={{ mt: 3 }}>
            Sub-Goals
          </Typography>
  
          {subGoals.map((subGoal, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                mt: 1,
                mb: 1,
              }}
            >
              <TextField
                label="Sub-Goal Name"
                value={subGoal.name}
                onChange={(e) =>
                  handleSubGoalChange(index, 'name', e.target.value)
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Amount"
                type="number"
                value={subGoal.amount ?? ''}
                onChange={(e) =>
                  handleSubGoalChange(index, 'amount', e.target.value)
                }
                sx={{ width: 120 }}
                size="small"
              />

              <Button
                variant="outlined"
                color="error"
                onClick={() => removeSubGoal(index)}
                size="small"
              >
                Remove
              </Button>
            </Box>
          ))}
  
          <Button
            variant="outlined"
            color="primary"
            onClick={addSubGoal}
            sx={{ mt: 1, mb: 3 }}
            size="small"
          >
            Add Sub-Goal
          </Button>
  
          {error && (
            <FormHelperText error sx={{ mb: 2 }}>
              {error}
            </FormHelperText>
          )}
  
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onClose}
              size="small"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                isLoading ||
                !goalName ||
                !goalAmount ||
                (subGoals.length > 0 && !isMatchingTotals)
              }
              size="small"
            >
              Save
            </Button>
          </Box>
        </form>
      </div>
    </div>
  );  
}

