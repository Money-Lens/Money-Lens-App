// import { Goal } from '../../types/goals';

const BASE_URL = 'http://localhost:5001/api';

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  params?: Record<string, string>;
  requireAuth?: boolean;
};

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  verification_status: string;
}

export type PlaidAccountsResponse = {
  accounts: PlaidAccount[];
};

export type SignupResponse = {
  message: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type LoginResponse = {
  token: string;
  user: {
    _id: string;
    email: string;
    name: string;
    lastName: string;
  };
};

export type PlaidLinkResponse = {
  link_token: string;
};

export type Account = {
  _id: string;
  name: string;
  type: string;
  balance: number;
  initial_balance?: number;
  balance_date?: Date | string;
  currency: string;
  institution: string;
  is_active: boolean;
  plaid_account_id?: string;
  plaid_mask?: string;
  plaid_subtype?: string;
};

export type AccountsResponse = {
  accounts: Account[];
  count: number;
};

export type Transaction = {
  _id: string;
  transaction_id: string;
  date: string;
  name: string;
  amount: number;
  category: string[];
  account_id: string;
  account?: Account;
};

export type TransactionsResponse = {
  transactions: Transaction[];
  count: number;
};

export type UserResponse = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type DashboardResponse = {
  todaySpending: number;
  recentTransactions: { amount: number; name: string; category: string }[];
  balance: number;
  monthlySpending: { month: string; spent: number; earned: number }[];
  weeklySpending: { weekStarting: string; spent: number; earned: number }[];
  dailyAvg: number; 
  monthAvg: { spent: number; earned: number };
  thisMonth: { spent: number; earned: number };
};

// CSV Import response type
export type CSVImportResponse = {
  success: boolean;
  count: number;
  skipped: number;
  errors: number;
  errorDetails?: any[];
};

export type AnalysisResponse = {
  transactions: { amount: number; name: string; category: string }[];
  balance: number;
  monthlySpending: { month: string; spent: number; earned: number }[];
  weeklySpending: { weekStarting: string; spent: number; earned: number }[];
  dailyAvg: number;
  monthAvg: { spent: number; earned: number };
  yearAvg: { spent: number; earned: number }; 
  weekAvg: { spent: number; earned: number };
  thisMonth: { spent: number; earned: number };
  recurringExpenses: {category: string, nextPaymentDate: string, frequency: string, name: string, amount: number}[]; 
  recurringIncomeSources: {name: string, amount: number}[]; 
  thisYear: { spent: number; earned: number }; 
  thisWeek: { spent: number; earned: number };
  spendingByCategory: { category: string, amount: number }[];
  topSources: { 
    thisWeek: TopSources;
    thisMonth: TopSources;
    thisYear: TopSources;
  };
};


export type GoalsResponse = Goal[];  
export type GoalType = 'Savings' | 'Spending Limit';
export type SpendingPeriod = 'Daily' | 'Monthly' | 'Weekly' | 'Yearly';
export type SubGoals = {
  _id: string; 
  name: string; 
  amount: number; 
  percent: number; 
};

export type Goal = {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  category: string;
  type: 'Savings' | 'Spending Limit';
  interval?: 'Date' | 'Daily' |'Monthly' | 'Weekly' | 'Yearly';
  userId: string; 
  selectedAccount: string[]; 
  subGoals: SubGoals[]; 
};

// Top sources (for analysis)
type TopSources = {
  topSpending: { name: string; amount: number }[];
  topEarning: { name: string; amount: number }[];
};



// Update apiRequest function
export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, params, requireAuth = true } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const queryParams = new URLSearchParams(params);
    url += `?${queryParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Data:', errorData);
      throw new Error(errorData.message || errorData.error || 'API request failed');
    }

    return response.json();
  } catch (error) {
    console.error(`API ${method} ${endpoint} failed:`, error);
    throw error;
  }
}

// Function for uploading files (like CSV)
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  let url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'File upload failed');
    }

    return response.json();
  } catch (error) {
    console.error(`File upload to ${endpoint} failed:`, error);
    throw error;
  }
}