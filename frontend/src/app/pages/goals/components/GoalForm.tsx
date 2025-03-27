// import React, { useState } from 'react';
// import styles from '../goals.module.css';

// interface SubGoals {
//   name: string; 
//   amount: number; 
//   percent: number; 
// }

// // Updated type to match API structure
// interface GoalFormProps {
//   onClose: () => void;
//   onSubmit: (goal: {
//     title: string;
//     description?: string;
//     targetAmount: number;
//     currentAmount: number;
//     targetDate: Date;
//     category: string;
//     type: 'Savings' | 'Spending Limit';
//     spendingPeriod?:'Daily' | 'Monthly' | 'Weekly' | 'Yearly';
//   }) => void;
//   initialGoal?: {
//     id: string;
//     title: string;
//     description?: string;
//     targetAmount: number;
//     currentAmount: number;
//     targetDate: Date;
//     category: string;
//     type: 'Savings' | 'Spending Limit';
//     spendingPeriod?: 'Daily' | 'Monthly' | 'Weekly' | 'Yearly';
//     savingSubGoals: [SubGoals]; 
//   };
// }

// export default function GoalForm({ onClose, onSubmit, initialGoal }: GoalFormProps) {
//   const [formData, setFormData] = useState({
//     title: initialGoal?.title || '',
//     targetAmount: initialGoal?.targetAmount || 0,
//     currentAmount: initialGoal?.currentAmount || 0,
//     targetDate: initialGoal?.targetDate || new Date(),
//     category: initialGoal?.category || 'Savings',
//     description: initialGoal?.description || '',
//     type: initialGoal?.type || 'Savings', 
//     savingSubGoals: initialGoal?.savingSubGoals || [], 
//   });

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
    
//     // Validate required fields
//     if (!formData.title.trim()) {
//       alert('Title is required');
//       return;
//     }
    
//     if (formData.targetAmount <= 0) {
//       alert('Target amount must be greater than 0');
//       return;
//     }
    
//     // Log what we're submitting to verify
//     console.log('Submitting goal data:', formData);
    
//     // Submit the form data
//     onSubmit(formData);
//   };

//   const isSpendingLimit = formData.type === 'Spending Limit';

//   return (
//     <div className={styles.modalOverlay}>
//       <div className={styles.modalContent}>
//         <h2>{initialGoal ? 'Edit Goal' : 'Add New Goal'}</h2>
//         <form onSubmit={handleSubmit}>
          

//           <div className={styles.formGroup}>
//             <label>Goal Type</label>
//             <select
//               value={formData.type}
//               onChange={(e) => setFormData({...formData, type: e.target.value as 'Savings' | 'Spending Limit'})}
//               required
//             >
//               <option value="Savings">Savings Goal</option>
//               <option value="Spending Limit">Spending Limit</option>
//             </select>
//           </div>



          
//           {formData.type === "Spending Limit" && (
//         <>

//           <div className={styles.formGroup}>
//             <label>Goal Title</label>
//             <input
//               type="text"
//               value={formData.title}
//               onChange={(e) => setFormData({...formData, title: e.target.value})}
//               required
//               placeholder="Enter goal title"
//             />
//           </div>

//           <div className={styles.formGroup}>
//             <label>Account</label>
//             <select
//               value={formData.type}
//               onChange={(e) => setFormData({...formData, type: e.target.value as 'Savings' | 'Spending Limit'})}
//               required
//             >
//               <option value="Savings">Savings Goal</option>
//               <option value="Spending Limit">Spending Limit</option>
//             </select>
//           </div>

        

            
//           <label>Category:</label>
//           <select value={formData.category} onChange={(e) => setFormData({...formData, targetAmount: Number(e.target.value)})}>
//             <option value="">Select Category</option>
//             <option value="food">Food</option>
//             <option value="entertainment">Entertainment</option>
//             <option value="travel">Travel</option>
//           </select>
//         </>
//       )}








//       {formData.type === "Savings" && (
//         <>
//           <div className={styles.formGroup}>
//             <label>Account</label>
//             <select
//               value={formData.type}
//               onChange={(e) => setFormData({...formData, type: e.target.value as 'Savings' | 'Spending Limit'})}
//               required
//             >
//               <option value="Savings">Savings Goal</option>
//               <option value="Spending Limit">Spending Limit</option>
//             </select>
//           </div>

//           <div>
//             <div className={styles.formGroup}>
//               <label>Goal Name</label>
//               <input
//                 type="text"
//                 value={formData.title}
//                 onChange={(e) => setFormData({...formData, title: e.target.value})}
//                 required
//                 placeholder="Enter goal title"
//               />
//             </div>

//             <div className={styles.formGroup}>
//               <label>{!isSpendingLimit ? 'Spending Limit' : 'Target Amount'}</label>
//               <input
//                 type="number"
//                 value={formData.targetAmount}
//                 onChange={(e) => setFormData({...formData, targetAmount: Number(e.target.value)})}
//                 required
//                 min="1"
//                 step="0.01"
//               />
//             </div>

//             <div className={styles.formGroup}>
//               <label>{!isSpendingLimit ? 'Spending Limit' : 'Target Amount'}</label>
//               <input
//                 type="number"
//                 value={formData.targetAmount}
//                 onChange={(e) => setFormData({...formData, targetAmount: Number(e.target.value)})}
//                 required
//                 min="1"
//                 step="0.01"
//               />
//             </div>


//           </div>
          

          

        

            
//           <label>Category:</label>
//           <select value={formData.category} onChange={(e) => setFormData({...formData, targetAmount: Number(e.target.value)})}>
//             <option value="">Select Category</option>
//             <option value="food">Food</option>
//             <option value="entertainment">Entertainment</option>
//             <option value="travel">Travel</option>
//           </select>
//         </>
//       )}

//           <div className={styles.formGroup}>
//             <label>{ 'Goal Name'}</label>
//             <input
//               type="number"
//               value={formData.targetAmount}
//               onChange={(e) => setFormData({...formData, targetAmount: Number(e.target.value)})}
//               required
//               min="1"
//               step="0.01"
//             />
//           </div>

//           <div className={styles.formGroup}>
//             <label>{isSpendingLimit ? 'Spending Limit' : 'Target Amount'}</label>
//             <input
//               type="number"
//               value={formData.targetAmount}
//               onChange={(e) => setFormData({...formData, targetAmount: Number(e.target.value)})}
//               required
//               min="1"
//               step="0.01"
//             />
//           </div>

//           <div className={styles.formGroup}>
//             <label>{isSpendingLimit ? 'Amount Spent' : 'Current Amount'}</label>
//             <input
//               type="number"
//               value={formData.currentAmount}
//               onChange={(e) => setFormData({...formData, currentAmount: Number(e.target.value)})}
//               required
//               min="0"
//               step="0.01"
//             />
//           </div>

//           <div className={styles.formGroup}>
//             <label>Target Date</label>
//             <input
//               type="date"
//               value={formData.targetDate instanceof Date ? formData.targetDate.toISOString().split('T')[0] : new Date(formData.targetDate).toISOString().split('T')[0]}
//               onChange={(e) => setFormData({...formData, targetDate: new Date(e.target.value)})}
//               required
//             />
//           </div>

//           <div className={styles.formGroup}>
//             <label>Description (Optional)</label>
//             <textarea
//               value={formData.description}
//               onChange={(e) => setFormData({...formData, description: e.target.value})}
//               placeholder="Add details about your financial goal"
//             />
//           </div>

//           <div className={styles.formActions}>
//             <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
//             <button type="submit" className={styles.saveButton}>Save Goal</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../assets/utilities/API_HANDLER';
import styles from '../goals.module.css';

export default function GoalForm({ onClose, onSubmit }) {

  const [initialGoal, setInitialGoal] = useState({
    goalType: 'Savings',
    goalName: '',
    goalAmount: 0,
    selectedAccount: null,
    // other fields
  });

  
  const [goalType, setGoalType] = useState(initialGoal?.goalType || 'Savings');  // Default type is Savings
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [subGoals, setSubGoals] = useState([{ name: '', amount: 0, percentage: 0 }]);
  const [goalName, setGoalName] = useState(initialGoal?.goalName ||'');
  const [goalAmount, setGoalAmount] = useState(initialGoal?.goalAmount ||0);
  const [limitAmount, setLimitAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [interval, setInterval] = useState('Daily');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false); 

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiRequest('/accounts', { requireAuth: true });
        // Check if 'accounts' is present in the response object
        setAccounts(Array.isArray(response.accounts) ? response.accounts : []);
      } catch (error) {
        setError('Failed to load accounts.');
      }
    };
    fetchAccounts();
  }, []);

  // Handle subgoal addition/removal
  const addSubGoal = () => {
    if (subGoals.length < 10) {
      setSubGoals([...subGoals, { name: '', amount: 0, percent: 0 }]);
    }
  };

  

  const removeSubGoal = (index) => {
    const newSubGoals = subGoals.filter((_, i) => i !== index);
    setSubGoals(newSubGoals);
  };

  const handleSubGoalChange = (index, field, value) => {
    const newSubGoals = [...subGoals];
    newSubGoals[index][field] = value;
    setSubGoals(newSubGoals);
  };

  const handleGoalTypeChange = (e) => {
    setGoalType(e.target.value);
    // Reset form states when changing goal type
    setSubGoals([{ name: '', amount: 0, percentage: 0 }]);
    setGoalAmount(0);
    setLimitAmount(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Construct the goal object based on type
      let goalData = {
        title: goalName,
        goalType,
        goalAmount,
        selectedAccount,
        subGoals,
        limitAmount,
        category,
        interval,
      };

      // Submit to the API
      await onSubmit(goalData);
      onClose(); // Close the form after submission
    } catch (error) {
      setError('Failed to create goal.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle percentage calculation and adjustment
  const updateSubGoalPercentages = () => {
    const totalPercentage = subGoals.reduce((sum, subGoal) => sum + parseFloat(subGoal.percent || 0), 0);
    const scale = totalPercentage === 100 ? 1 : 100 / totalPercentage;

    const newSubGoals = subGoals.map((subGoal) => ({
      ...subGoal,
      percent: (parseFloat(subGoal.percent || 0) * scale).toFixed(2),
    }));

    setSubGoals(newSubGoals);
  };

  // Handle the sum of subgoals
  const handleSubGoalAmountChange = () => {
    const totalSubGoalAmount = subGoals.reduce((sum, subGoal) => sum + parseFloat(subGoal.amount || 0), 0);
    if (totalSubGoalAmount > goalAmount) {
      setError('Sub-goal amounts cannot exceed total goal amount.');
    } else {
      setError(null);
    }
  };

  return (
    <div className={styles.modalOverlay} >
      <div className={styles.modalContent}>
         <h2>{initialGoal ? 'Edit Goal' : 'Add New Goal'}</h2>
    <form className={styles.form} onLoad={setIsAddingGoal(true)} onSubmit={handleSubmit}>
      <h1>Add New Goal</h1>
      <div className={`${styles.savingsGoal} ${styles.formGroup}`}>
        <label htmlFor="goalType">Goal Type</label>
        <select id="goalType" value={goalType} onChange={handleGoalTypeChange}>
          <option value="Savings">Savings</option>
          <option value="Spending Limit">Spending Limit</option>
        </select>

        <label htmlFor="goalName">Goal Name</label>
        <input
          type="text"
          id="goalName"
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
          required
        />

        {goalType === 'Savings' && (
          <>
            <label htmlFor="goalAmount">Goal Amount</label>
            <input
              type="number"
              id="goalAmount"
              value={goalAmount}
              onChange={(e) => setGoalAmount(Number(e.target.value))}
              required
            />

            <label htmlFor="selectedAccount">Account</label>
            <select
              id="selectedAccount"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            {/* Subgoals */}
            <h3>Sub-Goals</h3>
            {subGoals.map((subGoal, index) => (
              <div key={index} className={styles.subGoals}>
                <div className={styles.subGoalsInput}>
                  <label htmlFor="sub-goal-name">Sub-Goal Name</label>
                  <input
                    id = "sub-goal-name"
                    type="text"
                    placeholder="Sub-goal Name"
                    value={subGoal.name}
                    onChange={(e) => handleSubGoalChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className={styles.subGoalsInput}>
                  <label htmlFor="sub-goal-amount">Amount</label>
                  <input
                    id = "sub-goal-amount"
                    type="number"
                    placeholder="Amount"
                    value={subGoal.amount}
                    onChange={(e) => handleSubGoalChange(index, 'amount', e.target.value)}
                    onBlur={handleSubGoalAmountChange}
                  />
                </div>
                <div className={styles.subGoalsInput}>
                  <label htmlFor="sub-goal-percent">Percent of Savings to Allocate</label>
                  <input
                    id = "sub-goal-percent"
                    type="number"
                    placeholder="Percentage"
                    value={subGoal.percentage}
                    onChange={(e) => handleSubGoalChange(index, 'percentage', e.target.value)}
                    onBlur={updateSubGoalPercentages}
                  />
                </div>
                <button type="button" onClick={() => removeSubGoal(index)}>
                  Remove Sub-Goal
                </button>
              </div>
            ))}
          
          <button type="button" onClick={addSubGoal}>
            Add Sub-Goal
          </button>
          </>
        )}

        {goalType === 'Spending Limit' && (
          <>
            <label htmlFor="limitAmount">Limit Amount</label>
            <input
              type="number"
              id="limitAmount"
              value={limitAmount}
              onChange={(e) => setLimitAmount(Number(e.target.value))}
              required
            />

            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {/* Render categories here */}
            </select>

            <label htmlFor="interval">Target Interval</label>
            <select id="interval" value={interval} onChange={(e) => setInterval(e.target.value)} required>
              <option value="Date">Date</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Annually">Annually</option>
            </select>
          </>
        )}
      </div>
      {/* Submit button */}
      <button type="submit" disabled={isLoading}>Finish</button>

      {/* Cancel button */}
      <button
        type="button"
        className={styles.cancelButton} // Add your styling here for the cancel button
        onClick={() => setIsAddingGoal(false)} // Or use a function to close the modal
      >
        Cancel
      </button>
      {error && <div className={styles.error}>{error}</div>}
    </form>
    </div>
     </div>
  );
}
