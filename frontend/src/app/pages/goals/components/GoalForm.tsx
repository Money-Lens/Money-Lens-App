
// import React, { useState, useEffect } from 'react';
// import { apiRequest } from '../../../assets/utilities/API_HANDLER';
// import styles from '../goals.module.css';

// export default function GoalForm({ onClose, onSubmit }) {
//   // Use strings for numeric fields so they can be cleared.
//   const [initialGoal] = useState({
//     type: 'Savings',
//     title: '',
//     targetAmount: "0",
//     selectedAccount: '',
//     targetDate: '',
//   });

//   const [type, setType] = useState(initialGoal.type || 'Savings');
//   const [accounts, setAccounts] = useState([]);
//   const [selectedAccount, setSelectedAccount] = useState('');
//   const [subGoals, setSubGoals] = useState([
//     { id: Date.now(), name: '', amount: "0", percentage: "0" },
//   ]);
//   const [title, setTitle] = useState(initialGoal.title || '');
//   const [targetAmount, setTargetAmount] = useState(initialGoal.targetAmount || "0");
//   const [targetDate, setTargetDate] = useState('');
//   const [limitAmount, setLimitAmount] = useState("0");
//   const [category, setCategory] = useState('');
//   const [interval, setInterval] = useState('Daily');
//   const [error, setError] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);

//   // Compute tomorrow's date (YYYY-MM-DD) so that today/past dates cannot be selected.
//   const getTomorrowDateString = () => {
//     const tomorrow = new Date();
//     tomorrow.setDate(tomorrow.getDate() + 1);
//     return tomorrow.toISOString().split('T')[0];
//   };
//   const minDate = getTomorrowDateString();

//   // Inline style to remove spinner controls.
//   const noSpinnerStyle = {
//     MozAppearance: 'textfield',
//     WebkitAppearance: 'none',
//     appearance: 'none',
//   };

//   // Fetch accounts from API.
//   useEffect(() => {
//     const fetchAccounts = async () => {
//       try {
//         const response = await apiRequest('/accounts', { requireAuth: true });
//         setAccounts(Array.isArray(response.accounts) ? response.accounts : []);
//       } catch (error) {
//         setError('Failed to load accounts.');
//       }
//     };
//     fetchAccounts();
//   }, []);

//   // Add a new sub-goal with a unique id.
//   const addSubGoal = () => {
//     if (subGoals.length < 10) {
//       setSubGoals([
//         ...subGoals,
//         { id: Date.now(), name: '', amount: "0", percentage: "0" },
//       ]);
//     }
//   };

//   // Remove a sub-goal by index.
//   const removeSubGoal = (index) => {
//     setSubGoals(subGoals.filter((_, i) => i !== index));
//   };

//   // Update a sub-goal's field.
//   const handleSubGoalChange = (index, field, value) => {
//     const newSubGoals = [...subGoals];
//     newSubGoals[index][field] = value;
//     setSubGoals(newSubGoals);
//   };

//   // Reset numeric fields when goal type changes.
//   const handleTypeChange = (e) => {
//     setType(e.target.value);
//     setSubGoals([{ id: Date.now(), name: '', amount: "0", percentage: "0" }]);
//     setTargetAmount("0");
//     setLimitAmount("0");
//   };

//   // On submit, convert numeric string values to numbers.
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError(null);

//     try {
//       const goalData = {
//         title,
//         targetAmount: parseFloat(targetAmount) || 0,
//         targetDate,
//         type,
//         selectedAccount,
//         subGoals: subGoals.map((sg) => ({
//           ...sg,
//           amount: parseFloat(sg.amount) || 0,
//           percentage: parseFloat(sg.percentage) || 0,
//         })),
//         limitAmount: parseFloat(limitAmount) || 0,
//         category,
//         interval,
//       };

//       await onSubmit(goalData);
//       onClose();
//     } catch (error) {
//       setError('Failed to create goal.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const updateSubGoalPercentages = () => {
//     const totalPercentage = subGoals.reduce(
//       (sum, sg) => sum + (parseFloat(sg.percentage) || 0),
//       0
//     );
//     const scale = totalPercentage === 100 ? 1 : totalPercentage > 0 ? 100 / totalPercentage : 1;
//     const newSubGoals = subGoals.map((sg) => ({
//       ...sg,
//       percentage: ((parseFloat(sg.percentage) || 0) * scale).toFixed(2),
//     }));
//     setSubGoals(newSubGoals);
//   };

//   const handleSubGoalAmountChange = () => {
//     const totalSubGoalAmount = subGoals.reduce(
//       (sum, sg) => sum + (parseFloat(sg.amount) || 0),
//       0
//     );
//     if (totalSubGoalAmount > (parseFloat(targetAmount) || 0)) {
//       setError('Sub-goal amounts cannot exceed total goal amount.');
//     } else {
//       setError(null);
//     }
//   };

//   return (
//     <div className={styles.modalOverlay}>
//       <div className={styles.modalContent}>
//         <h2>Add New Goal</h2>
//         <form className={styles.form} onSubmit={handleSubmit}>
//           <div className={`${styles.savingsGoal} ${styles.formGroup}`}>
//             <label htmlFor="type">Goal Type</label>
//             <select id="type" value={type} onChange={handleTypeChange}>
//               <option value="Savings">Savings</option>
//               <option value="Spending Limit">Spending Limit</option>
//             </select>

//             <label htmlFor="title">Goal Name</label>
//             <input
//               type="text"
//               id="title"
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               required
//             />

//             {type === 'Savings' && (
//               <>
//                 <label htmlFor="targetAmount">Goal Amount</label>
//                 <input
//                   type="number"
//                   id="targetAmount"
//                   value={targetAmount}
//                   onChange={(e) => setTargetAmount(e.target.value)}
//                   style={noSpinnerStyle}
//                   required
//                 />

//                 <label htmlFor="targetDate">Target Date</label>
//                 <input
//                   type="date"
//                   id="targetDate"
//                   value={targetDate}
//                   onChange={(e) => setTargetDate(e.target.value)}
//                   min={minDate}
//                   required
//                 />

//                 <label htmlFor="selectedAccount">Account</label>
//                 <select
//                   id="selectedAccount"
//                   value={selectedAccount}
//                   onChange={(e) => setSelectedAccount(e.target.value)}
//                   required
//                 >
//                   {accounts.map((account) => (
//                     <option key={account._id} value={account._id}>
//                       {account.name}
//                     </option>
//                   ))}
//                 </select>

//                 <label htmlFor="category">Category</label>
//                 <select
//                   id="category"
//                   value={category}
//                   onChange={(e) => setCategory(e.target.value)}
//                   required
//                 >
//                   <option value="">Select Category</option>
//                   <option value="General">General</option>
//                   <option value="Emergency">Emergency</option>
//                   <option value="Retirement">Retirement</option>
//                   <option value="Education">Education</option>
//                 </select>

//                 <h3>Sub-Goals</h3>
//                 {subGoals.map((subGoal, index) => (
//                   <div key={subGoal.id} className={styles.subGoals}>
//                     <div className={styles.subGoalsInput}>
//                       <label htmlFor={`sub-goal-name-${subGoal.id}`}>Sub-Goal Name</label>
//                       <input
//                         id={`sub-goal-name-${subGoal.id}`}
//                         type="text"
//                         placeholder="Sub-goal Name"
//                         value={subGoal.name}
//                         onChange={(e) =>
//                           handleSubGoalChange(index, 'name', e.target.value)
//                         }
//                       />
//                     </div>
//                     <div className={styles.subGoalsInput}>
//                       <label htmlFor={`sub-goal-amount-${subGoal.id}`}>Amount</label>
//                       <input
//                         id={`sub-goal-amount-${subGoal.id}`}
//                         type="number"
//                         placeholder="Amount"
//                         value={subGoal.amount}
//                         onChange={(e) =>
//                           handleSubGoalChange(index, 'amount', e.target.value)
//                         }
//                         onBlur={handleSubGoalAmountChange}
//                         style={noSpinnerStyle}
//                       />
//                     </div>
//                     <div className={styles.subGoalsInput}>
//                       <label htmlFor={`sub-goal-percent-${subGoal.id}`}>
//                         Percent of Savings to Allocate
//                       </label>
//                       <input
//                         id={`sub-goal-percent-${subGoal.id}`}
//                         type="number"
//                         placeholder="Percentage"
//                         value={subGoal.percentage}
//                         onChange={(e) =>
//                           handleSubGoalChange(index, 'percentage', e.target.value)
//                         }
//                         onBlur={updateSubGoalPercentages}
//                         style={noSpinnerStyle}
//                       />
//                     </div>
//                     <button type="button" onClick={() => removeSubGoal(index)}>
//                       Remove Sub-Goal
//                     </button>
//                   </div>
//                 ))}
//                 <button type="button" onClick={addSubGoal}>
//                   Add Sub-Goal
//                 </button>
//               </>
//             )}

//             {type === 'Spending Limit' && (
//               <>
//                 <label htmlFor="limitAmount">Limit Amount</label>
//                 <input
//                   type="number"
//                   id="limitAmount"
//                   value={limitAmount}
//                   onChange={(e) => setLimitAmount(e.target.value)}
//                   style={noSpinnerStyle}
//                   required
//                 />

//                 <label htmlFor="category">Category</label>
//                 <select
//                   id="category"
//                   value={category}
//                   onChange={(e) => setCategory(e.target.value)}
//                   required
//                 >
//                   <option value="">Select Category</option>
//                   <option value="Food">Food</option>
//                   <option value="Entertainment">Entertainment</option>
//                 </select>

//                 <label htmlFor="interval">Target Interval</label>
//                 <select
//                   id="interval"
//                   value={interval}
//                   onChange={(e) => setInterval(e.target.value)}
//                   required
//                 >
//                   <option value="Date">Date</option>
//                   <option value="Daily">Daily</option>
//                   <option value="Weekly">Weekly</option>
//                   <option value="Monthly">Monthly</option>
//                   <option value="Annually">Annually</option>
//                 </select>
//               </>
//             )}
//           </div>
//           <button type="submit" disabled={isLoading}>
//             Finish
//           </button>
//           <button type="button" className={styles.cancelButton} onClick={onClose}>
//             Cancel
//           </button>
//           {error && <div className={styles.error}>{error}</div>}
//         </form>
//       </div>
//       <style jsx>{`
//         /* Remove spin buttons for number inputs */
//         input[type='number']::-webkit-inner-spin-button,
//         input[type='number']::-webkit-outer-spin-button {
//           -webkit-appearance: none;
//           margin: 0;
//         }
//         input[type='number'] {
//           -moz-appearance: textfield;
//         }
//       `}</style>
//     </div>
//   );
// }


import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../assets/utilities/API_HANDLER';
import styles from '../goals.module.css';

export default function GoalForm({ onClose, onSubmit, initialGoal: initialGoalProp }) {
  // Define default values
  const defaultInitialGoal = {
    type: 'Savings',
    title: '',
    targetAmount: "0",
    selectedAccount: '',
    targetDate: '',
    limitAmount: "0",
    category: '',
    interval: 'Daily',
    subGoals: [{ id: Date.now(), name: '', amount: "0", percentage: "0" }],
  };
  const initialGoal = initialGoalProp || defaultInitialGoal;

  // Use strings for numeric fields so they can be cleared.
  const [type, setType] = useState(initialGoal.type || 'Savings');
  const [accounts, setAccounts] = useState([]);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [subGoals, setSubGoals] = useState([{ name: '', amount: 0, percentage: 0 }]);
  const [goalName, setGoalName] = useState(initialGoal?.goalName ||'');
  const [goalAmount, setGoalAmount] = useState(initialGoal?.goalAmount ||0);
  const [limitAmount, setLimitAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [targetDate, setTargetDate]= useState(); 
  const [interval, setInterval] = useState('Daily');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false); 
  const [subGoalAmount, setSubGoalAmount] = useState(); 

  // Fetch accounts
  // useEffect(() => {
  //   const fetchAccounts = async () => {
  //     try {
  //       const response = await apiRequest('/accounts', { requireAuth: true });
  //       // Check if 'accounts' is present in the response object
  //       setAccounts(Array.isArray(response.accounts) ? response.accounts : []);
  //     } catch (error) {
  //       setError('Failed to load accounts.');
  //     }
  //   };
  //   fetchAccounts();
  // }, []);

  // useEffect(() => {

    

  //   fetchAccounts();
  // }, []);

  const fetchAccounts = async () => {
    try {
      
      console.log('Fetching accounts for goals form from API...');
      // const response = await apiRequest('/goals', { requireAuth: true });
      const data = await apiRequest('/accounts', { requireAuth: true });
      console.log('Parsed JSON data:', data);

      // setAccounts(data.map((account) => ({
      //   ...account,
      // })));
      setAccounts(data ); 
    } catch (error) {
      console.error('Error fetching accounts for goals form:', error);
      setError('Failed to load your accounts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };


  // Add a new sub-goal with a unique id
  const addSubGoal = () => {
    if (subGoals.length < 10) {
      setSubGoals([...subGoals, { id: Date.now(), name: '', amount: "0", percentage: "0" }]);
    }
  };

  //Auto-adjust amount on percent change for subgoals
  const adjustAmount = (index, percent) => {
    setSubGoalAmount(goalAmount*percent/100); 
    handleSubGoalChange(index, 'percentage', percent)
  }; 


  const removeSubGoal = (index) => {
    setSubGoals(subGoals.filter((_, i) => i !== index));
  };

  // Update a sub-goal field.
  const handleSubGoalChange = (index, field, value) => {
    const newSubGoals = [...subGoals];
    newSubGoals[index][field] = value;
    setSubGoals(newSubGoals);
  };

  // Update goal type and reset related fields.
  const handleTypeChange = (e) => {
    setType(e.target.value);
    setSubGoals([{ id: Date.now(), name: '', amount: "0", percentage: "0" }]);
    setTargetAmount("0");
    setLimitAmount("0");
  };

  // On submit, convert numeric strings to numbers.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const goalData = {
        title,
        targetAmount: parseFloat(targetAmount) || 0,
        targetDate, // Should be in YYYY-MM-DD format.
        type,
        selectedAccount,
        subGoals: subGoals.map((sg) => ({
          ...sg,
          amount: parseFloat(sg.amount) || 0,
          percentage: parseFloat(sg.percentage) || 0,
        })),
        limitAmount: parseFloat(limitAmount) || 0,
        category,
        interval,
      };

      await onSubmit(goalData);
      onClose();
    } catch (error) {
      setError('Failed to create goal.');
    } finally {
      setIsLoading(false);
    }
  };


  const updateSubGoalPercentages = () => {
    const totalPercentage = subGoals.reduce(
      (sum, sg) => sum + (parseFloat(sg.percentage) || 0),
      0
    );
    const scale = totalPercentage === 100 ? 1 : totalPercentage > 0 ? 100 / totalPercentage : 1;
    const newSubGoals = subGoals.map((sg) => ({
      ...sg,
      percentage: ((parseFloat(sg.percentage) || 0) * scale).toFixed(2),
    }));
    setSubGoals(newSubGoals);
  };

  const handleSubGoalAmountChange = () => {
    const totalSubGoalAmount = subGoals.reduce(
      (sum, sg) => sum + (parseFloat(sg.amount) || 0),
      0
    );
    if (totalSubGoalAmount > (parseFloat(targetAmount) || 0)) {
      setError('Sub-goal amounts cannot exceed total goal amount.');
    } else {
      setError(null);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>

         <h2>{initialGoal ? 'Edit Goal' : 'Add New Goal'}</h2>
         <form className={styles.form} onSubmit={handleSubmit}>
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
            <div className={styles.goalAmount}>
              <label htmlFor="goalAmount">Goal Amount</label>
              <input
                type="number"
                id="goalAmount"
                value={goalAmount}
                onChange={(e) => setGoalAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className={styles.formGroup}>
             <label>Target Date</label>
             <input
                type="date"
                value={
                  targetDate
                    ? targetDate.toISOString().split('T')[0]
                    : ''
                }
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value + 'T00:00:00'); // Ensure local time
                  setTargetDate(selectedDate);
                }}
                required
              />
           </div>

            <label htmlFor="selectedAccount">Account</label>
            <select
              id="selectedAccount"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              required
            >
              {fetchAccounts().map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>


            {/* Subgoals */}
            <h3 style={{ paddingTop: '20px' }}>Sub-Goals</h3>
            {subGoals.map((subGoal, index) => (
              <div key={index} className={styles.subGoals}>
                <div className={styles.subGoalsInput}>
                  <label htmlFor="sub-goal-name">Sub-Goal Name</label>
                  <input
                    id = "sub-goal-name"
                    type="text"
                    placeholder="Name"
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
                    onChange={(e) => handleSubGoalChange(index,'percent', e.target.value)}
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
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

            {interval === "Date" && (
              <>
                <div className={styles.formGroup}>
                <label>Target Date</label>
                <input
                  type="date"
                  value={
                    targetDate
                      ? targetDate.toISOString().split('T')[0]
                      : ''
                  }
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value + 'T00:00:00'); // Ensure local time
                    setTargetDate(selectedDate);
                  }}
                  required
                />
                </div>
              </>
            )}

          </>
        )}
      </div>
      {/* Submit button */}
      <button type="submit" disabled={isLoading}>Finish</button>

      {/* Cancel button */}
      <button
        type="button"
        className={styles.cancelButton} // Add your styling here for the cancel button
        onClick={onClose } // Or use a function to close the modal
      >
        Cancel
      </button>
      {error && <div className={styles.error}>{error}</div>}
    </form>

    </div>
  );
}

