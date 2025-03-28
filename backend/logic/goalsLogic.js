// const Goals = require('../models/Goal.model'); 
const User = require('../models/User.model'); 
const Transaction = require('../models/Transaction.model'); 
const Account = require('../models/Account.model'); 

const { Goal, SubGoal } = require('../models/Goal.model');



async function getGoals(userId) {
    try {
        // Ensure the user exists
        let dbUser = await User.findById(userId);
        if (!dbUser) {
            return { error: "User not found for id", userId };
        }

        // Fetch goals with a timeout (except in test environment)
        let goals;
        try {
            // In test environment, skip the timeout promise
            if (process.env.NODE_ENV === 'test') {


                console.log("Goal Model:", Goal);
                console.log("Goal.find:", typeof Goal.find);
                
                
                goals = await Goal.find({ userId }).populate('subGoals');

            } else {
                // In non-test environments, use timeout to prevent hanging
                console.log("Goal Model:", Goal);
                    console.log("Goal.find:", typeof Goal.find);
                goals = await Promise.race([
                    
                    Goal.find({ userId }).populate('subGoals'),  // Populate SubSavingGoal
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Goal lookup timed out")), 3000)
                    )

                ]);
            }

            if (!goals || !Array.isArray(goals)) {
                console.log("No goals found or invalid goal data");
                goals = [];
            }

            console.log("Goals found: ", goals);

            updateSavingGoals(goals);
            updateSpendingGoals(goals);

            return {
                goals, 

            };
        } catch (err) {
            console.error("Error finding goals:", err);
            // goals = [];
            return [];
        }
    } catch (err) {
        console.error("Error finding goals:", err);
        return [];
    }
};

async function getGoal(goalId){

    try {

        // Check if goalId is valid
        if (!goalId) {
            console.log("No goalId provided, returning empty object");
            return {}; 
        }

        let goal; 
        // In test environment, skip the timeout promise
        if (process.env.NODE_ENV === 'test') {


            goal = await Goal.find({ Goal_id: goalId });
        } else {
            // In non-test environments, use timeout to prevent hanging
            goal = await Promise.race([
                Goal.find({ Goal_id: goalId }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Goal lookup timed out")), 3000)
                )
            ]);
        }

        if (!goal) {
            console.log("No goals found or invalid goal data");
            goal = {};
        }
    } catch (err) {
        console.error("Error finding goals:", err);
        goal = {};
    }
}

async function updateSavingGoals(goals) {
    try {
        if (!goals || goals.length === 0) {
            return;
        }

        // Get the saving goals
        const savingsGoals = goals.filter(goal => goal.type === "Savings");

        // Iterate over each savings goal and update it
        for (const goal of savingsGoals) {
            const totalSavings = await getTotalSavingsForGoal(goal);
            await updateSubGoalAmount(totalSavings, goal);

            // Optionally, update the `updatedAt` field of the goal
            goal.updatedAt = new Date();
            await goal.save();  // Assuming goal is a Mongoose model instance
        }
    } catch (error) {
        console.error("Error updating saving goals:", error);
    }
}


async function updateSubGoalAmount(totalSavingsForGoal, goal) {
    try {
        if (totalSavingsForGoal === 0 || !goal || !goal.subGoals || !goal.subGoals) {
            return;
        }
        const goalPortion = totalSavingsForGoal/goal.subGoals.length;

        goal.subGoals = await Promise.all(
            goal.subGoals.map(async (subGoal) => {
                subGoal.currentAmount += goalPortion;
                await subGoal.save();
                return subGoal;
            })
        );
        

        console.log("Updated Sub-Goals:", goal.subGoal);
        return goal.subGoal; // Return updated sub-goals if needed
    } catch (error) {
        console.error("Error updating subgoal amount", error);
    }
}

async function updateSpendingGoals(goals) {
    try {
        if (!goals || goals.length === 0) {
            return;
        }
        // Get the spending goals
        const spendingGoals = goals.filter(goal => goal.type === "Spending Limit");
        // Iterate over each spending goal and update it
        for (const goal of spendingGoals) {
            const totalSpending = await getTotalSpendingForGoals(goal.accountId, goal.updatedAt, goal.category);
            goal.currentAmount += totalSpending;
            // Optionally, update the `updatedAt` field of the goal


            goal.updatedAt = new Date();
            await goal.save();  // Assuming goal is a Mongoose model instance
        }
    } catch (error) {
        console.error("Error updating spending goals:", error);
    }
}


async function getTotalSavingsForGoal(goal) {
    try {
        if (!goal || !goal.accountId || goal.accountId.length === 0) {
            console.log("No accounts linked to the goal, returning 0");
            return 0;
        }

        if (!(goal.updatedAt instanceof Date)) {
            console.error("Invalid updatedAt date: Expected a Date object");
            return 0;
        }

        // Convert updatedAt to YYYY-MM-DD format for comparison
        const formattedDate = goal.updatedAt.toISOString().split('T')[0];

        let totalAmount = 0;

        try {
            if (process.env.NODE_ENV === 'test') {
                const result = await Transaction.aggregate([
                    { 
                        $match: { 
                            account_id: { $in: goal.accountId },  // Match transactions from any linked account
                            date: { $gt: formattedDate }  // Transactions after the goal was last updated
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } } // Sum all matching transactions
                ]);
                totalAmount = result.length ? result[0].total : 0;
            } else {
                const result = await Promise.race([
                    Transaction.aggregate([
                        { 
                            $match: { 
                                account_id: { $in: goal.accountId }, 
                                date: { $gt: formattedDate }
                            } 
                        },
                        { $group: { _id: null, total: { $sum: "$amount" } } }
                    ]),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Transaction lookup timed out")), 3000)
                    )
                ]);
                totalAmount = result.length ? result[0].total : 0;
            }

            goal.currentAmount += totalAmount; 
        } catch (err) {
            console.error("Error finding transactions:", err);
        }

        return totalAmount;
    } catch (err) {
        console.error("Error processing request:", err);
        return 0;
    }
}


// async function getTotalSpendingForGoals(accountId, fromDate, category) {
//     try {
//         if (!accountId) {
//             console.log("No accountId provided, returning an empty object");
//             return {};
//         }

//         if (!(fromDate instanceof Date)) {
//             console.error("Invalid fromDate: Expected a Date object");
//             return {};
//         }

//         // Convert fromDate to YYYY-MM-DD format
//         const formattedDate = fromDate.toISOString().split('T')[0];

//         let totalByCategory = {};
//         try {
//             if (process.env.NODE_ENV === 'test') {
//                 const result = await Transaction.aggregate([
//                     { $match: { account_id: accountId, date: { $gt: formattedDate } } },
//                     { $unwind: "$category" }, // Unwind the categories array
//                     { $group: { _id: "$category", total: { $sum: "$amount" } } },
//                 ]);
//                 result.forEach((categoryData) => {
//                     totalByCategory[categoryData._id] = categoryData.total;
//                 });
//             } else {
//                 const result = await Promise.race([
//                     Transaction.aggregate([
//                         { $match: { account_id: accountId, date: { $gt: formattedDate } } },
//                         { $unwind: "$category" }, // Unwind the categories array
//                         { $group: { _id: "$category", total: { $sum: "$amount" } } },
//                     ]),
//                     new Promise((_, reject) =>
//                         setTimeout(() => reject(new Error("Transaction lookup timed out")), 3000)
//                     )
//                 ]);

//                 result.forEach((categoryData) => {
//                     totalByCategory[categoryData._id] = categoryData.total;
//                 });
//             }
//         } catch (err) {
//             console.error("Error finding transactions:", err);
//         }

//         totalByCategory.filter(item => item.category === category);
//         console.log("Total spending by goal category:", totalByCategory);

//         return totalByCategory;
//     } catch (err) {
//         console.error("Error processing request:", err);
//         return {};
//     }
// }



// //getSpending([account.id]], Goal.updatedAt)
// async function getSpendingForGoals(accountIds, fromDate) {
//     try {
//         let aggregatedSpending = {};

//         // Call getTotalSpendingForGoals for each accountId and aggregate the results by category
//         for (let accountId of accountIds) {
//             const totalByCategory = await getTotalSpendingForGoals(accountId, fromDate);

//             // Aggregate spending by category across all accounts
//             for (let category in totalByCategory) {
//                 if (aggregatedSpending[category]) {
//                     aggregatedSpending[category] += totalByCategory[category];
//                 } else {
//                     aggregatedSpending[category] = totalByCategory[category];
//                 }
//             }
//         }

//         return aggregatedSpending;
//     } catch (err) {
//         console.error("Error processing spending for goals:", err);
//         return {};
//     }
// }


// async function addSubGoalToGoal(goalId, subgoalData) {
//     try {
//       const goal = await Goal.findById(goalId);
//       if (!goal) {
//         console.log("Goal not found");
//         return;
//       }
  
//       // Add new goal to the goals array
//       goal.subGoals.push(subgoalData);
  
//       // Save the updated user document
//       await goal.save();
//       console.log("Subgoal added successfully:", subgoalData);
//       return goal;

//     } catch (error) {
//       console.error("Error adding goal:", error);
//       throw error;
//     }
//   }
  



module.exports = { getGoals, getGoal, updateSavingGoals, updateSpendingGoals, getTotalSavingsForGoal, updateSubGoalAmount };