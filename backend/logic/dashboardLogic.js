const User = require("../models/User.model.js");
const { Transaction } = require("../models/Transaction.model.js");

/**
 * Fetches transaction-related data for the dashboard.
 */
async function getDashboardData(userId) {
    try {
        // ensure the user exists
        const dbUser = await User.findById(userId);
        if (!dbUser) {
        return { error: "User not found" };
        }

        // Fetch transactions for this user
        const transactions = await Transaction.find({ user_id: userId });

        console.log("Fetched transactions:", transactions);

        // Calculate total spent and total earned across all transactions
        let totalSpent = 0;
        let totalEarned = 0;
        transactions.forEach(t => {
            let amount = parseFloat(t.amount);
            if (amount > 0) {
                totalSpent += amount;
            } else {
                totalEarned += Math.abs(amount); // negative values are for money earned
            }
        });

        // Get today's transactions
        const todaySpending = await getTodaySpending(transactions);

        // get recent transactions (last 20)
        const recentTransactions = await getRecentTransactions(transactions);

        // calculate balance
        const balance = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // get monthly & weekly spending/earning data (for chart)
        const monthlySpending = await getMonthlySpending(transactions);
        const weeklySpending = await getWeeklySpending(transactions);

        // calculate This Month's Stats
        const currentMonthKey = new Date().toISOString().slice(0, 7); // Format: "YYYY-MM"
        const thisMonthData = monthlySpending.find(m => m.month === currentMonthKey) || { spent: 0, earned: 0 };

        // Get the date of the oldest transaction (for averages)
        let oldestTransactionDate = transactions.length > 0 
            ? new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())))
            : new Date();

        // Get the current date
        const today = new Date();

        // Calculate the number of months between the first transaction and today
        const totalMonths = (today.getFullYear() - oldestTransactionDate.getFullYear()) * 12 
            + (today.getMonth() - oldestTransactionDate.getMonth()) + 1;
        const monthsCount = Math.max(totalMonths, 1); // ensure this is at least 1

        // Calculate Monthly Averages
        const monthAvg = {
            spent: monthsCount > 0 ? parseFloat((totalSpent / monthsCount).toFixed(2)) : 0,
            earned: monthsCount > 0 ? parseFloat((totalEarned / monthsCount).toFixed(2)) : 0
        };

        // Calculate number of days since the oldest transaction (for finding daily avg.)
        const timeDiff = today.getTime() - oldestTransactionDate.getTime();
        const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
        const dailyAvg = totalDays > 0 ? parseFloat((totalSpent / totalDays).toFixed(2)) : 0;

        console.log("Oldest Transaction Date:", oldestTransactionDate.toISOString().split("T")[0]);
        console.log("Total Days:", totalDays);
        console.log("Daily Average Spending:", dailyAvg);

        console.log("Monthly Spending Data:", monthlySpending);
        console.log("This Month:", thisMonthData);
        console.log("Average Monthly:", monthAvg);
        console.log("Daily Average Spending:", dailyAvg);

        return {
            todaySpending,
            recentTransactions,
            balance,
            monthlySpending,
            weeklySpending,
            thisMonth: thisMonthData,
            monthAvg,
            dailyAvg
        };
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return { error: error.message };
    }
}

async function getTodaySpending(transactions) {
    try {
        const todayDate = new Date().toISOString().split("T")[0];
        const result = transactions
        .filter((t) => {
            if (!t.date) return false;
            const transactionDate = new Date(t.date).toISOString().split("T")[0];
            return transactionDate === todayDate;
        }).reduce((sum, t) => {
            const amount = parseFloat(t.amount);
            return !isNaN(amount) ? sum + amount : sum;
        }, 0);
        // .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        console.log("Todays spending: ", result); 
        return result; 
    } catch (error) {
        console.error("Error getting todays spending:", error); 
        return {error: error.message}; 
    }
}

async function getRecentTransactions(transactions) {
    try {
        const result = transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20)
            .map((t) => ({
                amount: parseFloat(t.amount),
                name: t.name,
                category: t.category?.[1] || "Unknown",
            }));

        console.log("Recent Transactions: ", result); 
        return result; 
    } catch (error) {
        console.error("Error getting recent transactions:", error); 
        return {error: error.message}; 
    }
}

async function getMonthlySpending(transactions) {
    try {
        let monthlySpending = [];
        let totalSpent = 0;
        let totalEarned = 0;
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const monthKey = `${year}-${month}`;
            
            // Filter transactions for this month
            const monthTransactions = transactions.filter(t => {
                if (!t.date) return false;
                const transactionMonth = new Date(t.date).toISOString().slice(0, 7); // "YYYY-MM"
                return transactionMonth === monthKey;
            });
            
            // Separate spent (positive) from earned (negative) (why did plaid set up - to be positive??)
            const spent = monthTransactions
                .filter(t => !isNaN(parseFloat(t.amount)) && parseFloat(t.amount) > 0)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const earned = (monthTransactions || [])
                .filter(t => !isNaN(parseFloat(t.amount)) && parseFloat(t.amount) < 0)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            totalSpent += spent;
            totalEarned += earned;
            
            // Round to 2 decimal places
            monthlySpending.push({ 
                month: monthKey, 
                spent: isNaN(spent) ? 0 : parseFloat(spent.toFixed(2)),
                earned: isNaN(earned) ? 0 : parseFloat(earned.toFixed(2)),
                net: isNaN(spent + earned) ? 0 : parseFloat((spent + earned).toFixed(2))
            });
        }

        console.log("Monthly spending data: ", monthlySpending); 
        return monthlySpending; 
    } catch (error) {
        console.error("Error getting monthly spending data:", error); 
        return {error: error.message}; 
    }
}

async function getWeeklySpending(transactions) {
    try {
        let weeklySpending = [];
        // Get weeks for the last 12 weeks
        for (let i = 0; i < 12; i++) {
            const today = new Date();
            // Get start of week (Sunday)
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() - (7 * i));
            startOfWeek.setHours(0, 0, 0, 0);
            
            // Get end of week (Saturday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            
            const weekKey = startOfWeek.toISOString().slice(0, 10);
            
            // Filter transactions for this week
            const weekTransactions = transactions.filter(t => {
                if (!t.date) return false;
                const txDate = new Date(t.date);
                return txDate >= startOfWeek && txDate <= endOfWeek;
            });
            
            // Calculate spent and earned
            const spent = weekTransactions
                .filter(t => !isNaN(parseFloat(t.amount)) && parseFloat(t.amount) > 0)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const earned = weekTransactions
                .filter(t => !isNaN(parseFloat(t.amount)) && parseFloat(t.amount) < 0)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                
            weeklySpending.push({
                weekStarting: weekKey,
                spent: isNaN(spent) ? 0 : parseFloat(spent.toFixed(2)),
                earned: isNaN(earned) ? 0 : parseFloat(earned.toFixed(2)),
                net: isNaN(spent + earned) ? 0 : parseFloat((spent + earned).toFixed(2))
            });
        }
        
        console.log("Weekly spending data: ", weeklySpending);
        return weeklySpending;
    } catch (error) {
        console.error("Error getting weekly spending data:", error);
        return {error: error.message};
    }
}

module.exports = { getDashboardData, getTodaySpending,  getMonthlySpending, getWeeklySpending, getRecentTransactions};
