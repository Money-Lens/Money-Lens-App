'use client';

import {
  Account,
  AccountsResponse,
  apiRequest,
  PlaidLinkResponse,
} from '@/app/assets/utilities/API_HANDLER';
import CSVImportForm from '@/app/components/file-import/CSVImportForm';
import { Building, Plus, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import styles from '../../assets/page.module.css';
import Card from '../../components/Card';
import AlertBanner from '@/app/components/AlertBanner';
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Button,
} from '@mui/material';

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [hasPlaidConnection, setHasPlaidConnection] = useState(false);

  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'checking',
    balance: 0,
    currency: 'USD',
    institution: '',
  });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState(false);
  const [plaidAccountsToSetup, setPlaidAccountsToSetup] = useState<Account[]>([]);
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0);
  const [initialBalanceInput, setInitialBalanceInput] = useState('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('success');
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchAccounts();
    }
  }, [isCheckingAuth]);

  const fetchAccounts = async () => {
    try {
      const data = await apiRequest<AccountsResponse>('/accounts');
      setAccounts(data.accounts);
      const plaidAccounts = data.accounts.filter(
        (account) => account.type === 'plaid'
      );
      setHasPlaidConnection(plaidAccounts.length > 0);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
      setHasPlaidConnection(false);
    }
  };

  useEffect(() => {
    if (!isCheckingAuth) {
      const fetchLinkToken = async () => {
        try {
          const data = await apiRequest<PlaidLinkResponse>(
            '/plaid/create_link_token',
            { method: 'POST' }
          );
          if (data.link_token) {
            setLinkToken(data.link_token);
            console.log('Received link token:', data.link_token);
          }
        } catch (error) {
          console.error('Error fetching link token:', error);
        }
      };
      fetchLinkToken();
    }
  }, [isCheckingAuth]);

  const fetchHistoricalTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest('/plaid/transactions/historical', {
        method: 'GET',
      });
      console.log('Historical transactions fetch completed:', data);
      showAlert(`Successfully processed ${data.total_transactions} historical transactions. Check your transactions page.`, 'success');
      fetchAccounts();
    } catch (error) {
      console.error('Error fetching historical transactions:', error);
      showAlert('Error fetching historical transactions. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your bank account?')) return;
    setIsLoading(true);
    try {
      await apiRequest('/plaid/disconnect', { method: 'POST' });
      await apiRequest('/accounts/plaid', { method: 'DELETE' });
      await fetchAccounts();
      showAlert('Bank account disconnected and plaid accounts deleted successfully', 'success');
    } catch (error) {
      console.error('Error disconnecting account:', error);
      showAlert('Failed to disconnect bank account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onSuccess = async (public_token: string) => {
    console.log('Plaid onSuccess – public_token:', public_token);
    setIsLoading(true);
    try {
      const response = await apiRequest('/plaid/set_access_token', {
        method: 'POST',
        body: { public_token },
      });

      const transactionsData = await apiRequest('/plaid/transactions');
      console.log('Transactions received:', transactionsData);

      try {
        await fetchAccounts();
        if (response.accounts && response.accounts.length > 0) {
          const plaidAccounts = response.accounts.filter(
            (account: Account) => account.type === 'plaid'
          );
          if (plaidAccounts.length > 0) {
            setPlaidAccountsToSetup(plaidAccounts);
            setCurrentAccountIndex(0);
            setInitialBalanceInput('');
            setShowInitialBalanceModal(true);
          }
        }
      } catch (error) {
        console.error('Error updating accounts after connection:', error);
      }
    } catch (error) {
      console.error('Error during Plaid flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetInitialBalance = async () => {
    const currentAccount = plaidAccountsToSetup[currentAccountIndex];
    const balanceValue = parseFloat(initialBalanceInput);

    if (isNaN(balanceValue)) {
      showAlert('Please enter a valid number for the balance.', 'warning');
      return;
    }

    try {
      await apiRequest(`/accounts/${currentAccount._id}/initial-balance`, {
        method: 'PUT',
        body: { initial_balance: balanceValue },
      });

      await fetchAccounts();

      if (currentAccountIndex < plaidAccountsToSetup.length - 1) {
        setCurrentAccountIndex(currentAccountIndex + 1);
        setInitialBalanceInput('');
      } else {
        setShowInitialBalanceModal(false);
        setPlaidAccountsToSetup([]);
        showAlert('All account balances have been set successfully!', 'success');
      }
    } catch (error) {
      console.error('Error setting initial balance:', error);
      showAlert(`Failed to set initial balance for ${currentAccount.name}. Please try again.`, 'error');
    }
  };

  const config = {
    token: linkToken!,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(
    linkToken ? config : { token: '', onSuccess: () => {} }
  );

  const handleCSVImportSuccess = () => {
    setShowCSVImport(false);
    showAlert('Transactions imported successfully', 'success');
    fetchAccounts();
  };

  const handleCreateAccount = async () => {
    setIsLoading(true);
    try {
      await apiRequest('/accounts', {
        method: 'POST',
        body: newAccount,
      });
      setNewAccount({
        name: '',
        type: 'checking',
        balance: 0,
        currency: 'USD',
        institution: '',
      });
      setShowCreateAccountModal(false);
      await fetchAccounts();
      showAlert('Account created successfully', 'success');
    } catch (error) {
      console.error('Error creating account:', error);
      showAlert('Failed to create account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    setIsLoading(true);
    try {
      await apiRequest(`/accounts/${accountToDelete._id}`, {
        method: 'DELETE',
      });
      setShowDeleteConfirmation(false);
      setAccountToDelete(null);
      await fetchAccounts();
      showAlert('Account and associated transactions deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting account:', error);
      showAlert('Failed to delete account', 'error');
    } finally {
      setIsLoading(false);
    }
  };


return (
  <div className={styles.dashboard}>
    {alertMessage && (
        <AlertBanner
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
    <Card className={styles.fullPageCard}>
      <div style={localStyles.container}>
        {isLoading && (
          <div style={localStyles.loaderStyle}>
            Updating your account, please wait (Max: 10 seconds)...
          </div>
        )}
        <h1 style={localStyles.title}>Bank Account Connection</h1>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowCSVImport(!showCSVImport)}
        >
          {showCSVImport ? 'Cancel Import' : 'Show CSV Import'}
        </Button>
        {showCSVImport && (
          <CSVImportForm
            onClose={() => setShowCSVImport(false)}
            onSuccess={handleCSVImportSuccess}
          />
        )}
        {/* Accounts Section */}
        <div style={localStyles.section}>
          <div style={localStyles.sectionHeader}>
            <h2 style={localStyles.subtitle}>Your Accounts</h2>
            <div style={localStyles.headerButtons}>
              <Button
                variant="contained"
                color="success"
                startIcon={<Plus size={16} />}
                onClick={() => setShowCreateAccountModal(true)}
              >
                Create Account
              </Button>

              <Button
                variant="contained"
                color="success"
                startIcon={<Building size={16} />}
                onClick={() => open()}
                // disabled={!linkToken || !ready}
              >
                Connect Bank
              </Button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div style={localStyles.emptyState}>
              <p>
                You don't have any accounts yet. Create a manual account or
                connect to your bank.
              </p>
            </div>
          ) : (
            <>
              {/* Manual Accounts */}
              <div style={localStyles.accountsSection}>
                <h3 style={localStyles.accountsSubtitle}>Manual Accounts</h3>
                <div style={localStyles.accountsList}>
                  {accounts
                    .filter((account) => account.type !== 'plaid')
                    .map((account) => (
                      <div key={account._id} style={localStyles.accountItem}>
                        <div style={localStyles.accountInfo}>
                          <strong>{account.name}</strong>
                          <span style={localStyles.accountType}>
                            {account.type}
                          </span>
                        </div>
                        <div style={localStyles.accountBalance}>
                          {account.currency} {account.balance.toFixed(2)}
                        </div>
                        <div style={localStyles.accountActions}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Trash size={16} />}
                            onClick={() => {
                              setAccountToDelete(account);
                              setShowDeleteConfirmation(true);
                            }}
                            disabled={isLoading}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}

                  {accounts.filter((account) => account.type !== 'plaid')
                    .length === 0 && (
                    <div style={localStyles.emptyAccountsMessage}>
                      No manual accounts yet. Create one to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Plaid Accounts */}
              <div style={localStyles.accountsSection}>
                <h3 style={localStyles.accountsSubtitle}>
                  Connected Bank Accounts
                </h3>
                <div style={localStyles.accountsList}>
                  {accounts
                    .filter((account) => account.type === 'plaid')
                    .map((account) => (
                      <div key={account._id} style={localStyles.accountItem}>
                        <div style={localStyles.accountInfo}>
                          <strong>{account.name}</strong>
                          {account.plaid_mask && (
                            <span style={localStyles.accountNumber}>
                              •••• {account.plaid_mask}
                            </span>
                          )}
                          {account.plaid_subtype && (
                            <span style={localStyles.accountType}>
                              {account.plaid_subtype}
                            </span>
                          )}
                        </div>
                        <div style={localStyles.accountBalance}>
                          {account.currency} {account.balance.toFixed(2)}
                        </div>
                        <div style={localStyles.accountInstitution}>
                          {account.institution}
                        </div>
                      </div>
                    ))}

                  {accounts.filter((account) => account.type === 'plaid')
                    .length === 0 && (
                    <div style={localStyles.emptyAccountsMessage}>
                      No bank accounts connected. Use the "Connect Bank"
                      button to link your accounts.
                    </div>
                  )}
                </div>

                {hasPlaidConnection && (
                  <div style={localStyles.buttonGroup}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleDisconnect}
                      disabled={isLoading}
                    >
                      {isLoading
                        ? 'Processing...'
                        : 'Disconnect All Bank Accounts'}
                    </Button>

                    <Button
                      variant="contained"
                      sx={{
                        backgroundColor: '#4285F4',
                        '&:hover': { backgroundColor: '#357ae8' },
                      }}
                      onClick={fetchHistoricalTransactions}
                      disabled={isLoading}
                    >
                      {isLoading
                        ? 'Processing...'
                        : 'Fetch Historical Transactions (24 Months)'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Create Account Modal */}
        {showCreateAccountModal && (
          <div style={localStyles.modalOverlay}>
            <div style={localStyles.modalContent}>
              <h3 style={{ marginBottom: 10 }}>Create a New Account</h3>

              <form
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateAccount();
                }}
              >
                <TextField
                  label="Account Name"
                  variant="outlined"
                  size="small"
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, name: e.target.value })
                  }
                  placeholder="e.g., My Checking Account"
                  fullWidth
                  required
                />

                <FormControl fullWidth required>
                  <InputLabel id="account-type-label">
                    Account Type
                  </InputLabel>
                  <Select
                    labelId="account-type-label"
                    label="Account Type"
                    value={newAccount.type}
                    size="small"
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, type: e.target.value })
                    }
                    fullWidth
                  >
                    <MenuItem value="checking">Checking</MenuItem>
                    <MenuItem value="savings">Savings</MenuItem>
                    <MenuItem value="credit">Credit Card</MenuItem>
                    <MenuItem value="loan">Loan</MenuItem>
                    <MenuItem value="investment">Investment</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Starting Balance"
                  variant="outlined"
                  type="number"
                  size="small"
                  value={newAccount.balance}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      balance: parseFloat(e.target.value),
                    })
                  }
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel id="currency-label">Currency</InputLabel>
                  <Select
                    labelId="currency-label"
                    label="Currency"
                    size="small"
                    value={newAccount.currency}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        currency: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="USD">USD - US Dollar</MenuItem>
                    <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                    <MenuItem value="AUD">AUD - Australian Dollar</MenuItem>
                    <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Institution (optional)"
                  variant="outlined"
                  size="small"
                  value={newAccount.institution}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      institution: e.target.value,
                    })
                  }
                  placeholder="e.g., Chase, Bank of America"
                  fullWidth
                />

                {/* Save / Cancel Buttons */}
                <Box
                  display="flex"
                  justifyContent="flex-end"
                  gap={2}
                  marginTop="20px"
                >
                  <Button
                    variant="outlined"
                    onClick={() => setShowCreateAccountModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isLoading || !newAccount.name}
                  >
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </Button>
                </Box>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && accountToDelete && (
          <div style={localStyles.modalOverlay}>
            <div style={localStyles.modalContent}>
              <h3>Confirm Account Deletion</h3>

              <p style={localStyles.warningText}>
                Are you sure you want to delete the account "
                {accountToDelete.name}"?
              </p>
              <p style={localStyles.warningText}>
                All transactions associated with this account will also be
                deleted. This action cannot be undone.
              </p>

              <div style={localStyles.modalButtons}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setAccountToDelete(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Initial Balance Setup Modal for Plaid Accounts */}
        {showInitialBalanceModal && plaidAccountsToSetup.length > 0 && (
          <div style={localStyles.modalOverlay}>
            <div style={localStyles.modalContent}>
              <h3 style={{ marginBottom: 20 }}>Set Initial Account Balance</h3>
              
              <p style={{ marginBottom: 20 }}>
                Please enter the current balance for your account. This balance will be used as the starting point,
                and only transactions after this point will update your balance.
              </p>
              
              {currentAccountIndex < plaidAccountsToSetup.length && (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ marginBottom: 5 }}>
                      {plaidAccountsToSetup[currentAccountIndex].name}
                      {plaidAccountsToSetup[currentAccountIndex].plaid_mask && 
                        ` (••••${plaidAccountsToSetup[currentAccountIndex].plaid_mask})`}
                    </h4>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {plaidAccountsToSetup[currentAccountIndex].plaid_subtype || 'Account'} at {plaidAccountsToSetup[currentAccountIndex].institution || 'Bank'}
                    </span>
                    <p style={{ marginTop: 10, color: '#888', fontSize: '14px' }}>
                      Account {currentAccountIndex + 1} of {plaidAccountsToSetup.length}
                    </p>
                  </div>
                  
                  <TextField
                    label="Current Balance"
                    variant="outlined"
                    type="number"
                    size="medium"
                    value={initialBalanceInput}
                    onChange={(e) => setInitialBalanceInput(e.target.value)}
                    fullWidth
                    autoFocus
                    placeholder="Enter the current balance"
                    InputProps={{
                      startAdornment: <span style={{ marginRight: 8 }}>
                        {plaidAccountsToSetup[currentAccountIndex].currency || 'USD'}
                      </span>,
                    }}
                  />
                  
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    gap={2}
                    marginTop="30px"
                  >
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        // If user skips, we'll use 0 as the default
                        setInitialBalanceInput('0');
                        handleSetInitialBalance();
                      }}
                    >
                      Skip
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSetInitialBalance}
                      disabled={isLoading || initialBalanceInput === ''}
                    >
                      {isLoading ? 'Saving...' : 'Save Balance'}
                    </Button>
                  </Box>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  </div>
);
}

const localStyles = {
container: {
  // maxWidth: '900px',
  // margin: '0 auto',
},
title: {
  fontSize: '24px',
  marginBottom: '15px',
},
subtitle: {
  fontSize: '20px',
  marginBottom: '15px',
  color: '#444',
},
section: {
  marginBottom: '30px',
  padding: '20px',
  borderRadius: '8px',
},
searchContainer: {
  marginBottom: '20px',
},
searchInput: {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ddd',
  fontSize: '16px',
  width: '100%',
  marginTop: '5px',
},
datePickerContainer: {
  display: 'flex',
  gap: '20px',
  marginBottom: '20px',
},
datePickerGroup: {
  display: 'flex',
  flexDirection: 'column' as const,
  flex: 1,
},
label: {
  marginBottom: '5px',
  color: '#666',
  minWidth: '130px',
  textAlign: 'right' as const,
},
input: {
  padding: '8px',
  borderRadius: '4px',
  // border: '2px solid #ddd',
  fontSize: '16px',
  flex: 1,
  textAlign: 'right' as const,
},

plaidButton: {
  backgroundColor: '#00b300',
  color: 'white',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  opacity: 1,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
},
importButton: {
  backgroundColor: '#0066cc',
  color: 'white',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  marginBottom: '16px',
},
fetchButton: {
  backgroundColor: '#0066cc',
  color: 'white',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  width: '100%',
},
dashboardButton: {
  backgroundColor: '#666',
  color: 'white',
  padding: '12px 24px 12px 24px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
},
tableContainer: {
  marginTop: '20px',
  overflowX: 'auto' as const,
},
table: {
  width: '100%',
  borderCollapse: 'collapse' as const,
  backgroundColor: 'white',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
},
th: {
  backgroundColor: '#f8f9fa',
  padding: '12px',
  textAlign: 'left' as const,
  borderBottom: '2px solid #dee2e6',
  color: '#495057',
},
td: {
  padding: '12px',
  borderBottom: '1px solid #dee2e6',
  color: '#212529',
},
accountsList: {
  marginBottom: '20px',
},
accountItem: {
  padding: '12px',
  backgroundColor: 'white',
  borderRadius: '4px',
  marginBottom: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
},
reconnectButton: {
  backgroundColor: '#4CAF50',
  color: 'white',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
},
buttonGroup: {
  display: 'flex',
  // justifyContent: 'space-between',
  gap: '10px',
  marginTop: '16px',
  marginBottom: '16px',
},
disconnectButton: {
  backgroundColor: '#dc3545',
  color: 'white',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
},
loaderStyle: {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  fontSize: '18px',
  zIndex: 1000,
},
sectionHeader: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
},
headerButtons: {
  display: 'flex',
  gap: '10px',
},
createButton: {
  backgroundColor: '#4CAF50',
  color: 'white',
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
},
accountsSection: {
  marginBottom: '30px',
},
accountsSubtitle: {
  fontSize: '18px',
  marginBottom: '10px',
  color: '#444',
  borderBottom: '1px solid #ddd',
  paddingBottom: '8px',
},
accountInfo: {
  display: 'flex',
  flexDirection: 'column' as const,
  flex: '1',
},
accountType: {
  color: '#666',
  fontSize: '14px',
  textTransform: 'capitalize' as const,
},
accountNumber: {
  color: '#666',
  fontSize: '14px',
},
accountBalance: {
  fontWeight: 'bold' as const,
  minWidth: '120px',
  textAlign: 'right' as const,
},
accountInstitution: {
  color: '#666',
  fontSize: '14px',
  minWidth: '100px',
  textAlign: 'right' as const,
},
accountActions: {
  display: 'flex',
  gap: '5px',
  minWidth: '80px',
  justifyContent: 'flex-end',
},
deleteButton: {
  backgroundColor: '#dc3545',
  color: 'white',
  padding: '5px 10px',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '12px',
},
emptyState: {
  textAlign: 'center' as const,
  padding: '30px',
  color: '#666',
},
emptyAccountsMessage: {
  padding: '15px',
  color: '#666',
  textAlign: 'center' as const,
  fontStyle: 'italic',
},
modalOverlay: {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
},
modalContent: {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '8px',
  maxWidth: '500px',
  width: '100%',
},
formGroup: {
  marginBottom: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '20px',
},
modalButtons: {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '30px',
},
cancelButton: {
  backgroundColor: '#f5f5f5',
  color: '#333',
  padding: '8px 16px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
},
saveButton: {
  backgroundColor: '#4CAF50',
  color: 'white',
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
},
deleteConfirmButton: {
  backgroundColor: '#dc3545',
  color: 'white',
  padding: '8px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
},
warningText: {
  color: '#dc3545',
  fontWeight: 'bold' as const,
  marginBottom: '10px',
},
};
