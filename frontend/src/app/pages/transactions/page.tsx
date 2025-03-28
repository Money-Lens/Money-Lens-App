'use client';

import { useEffect, useState } from 'react';
import styles from '../../assets/page.module.css';
import {
  apiRequest,
  type Transaction,
  TransactionsResponse,
} from '../../assets/utilities/API_HANDLER';
import Card from '../../components/Card';
import {
  Edit,
  Trash,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Box,
  Button,
} from '@mui/material';
import dayjs from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import AlertBanner from '@/app/components/AlertBanner';


export default function Transaction() {
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>(''); // Added search state
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Edit mode state
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editValues, setEditValues] = useState({
    name: '',
    amount: 0,
    category: '',
    date: '',
  });

  // Advanced filter state
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('all'); // 'all', 'credit', 'debit'
  const [sortOrder, setSortOrder] = useState<string>('newest'); // 'newest', 'oldest', 'largest', 'smallest'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Bulk selection state
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState({
    name: '',
    amount: '',
    category: '',
    date: '',
  });

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('success');
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
  };

  // Initial load of transactions
  useEffect(() => {
    fetchStoredTransactions();
    fetchAvailableCategories();
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch unique categories for the filter dropdown
  const fetchAvailableCategories = async () => {
    try {
      const response = await apiRequest('/transactions/categories');
      setAvailableCategories(response.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch accounts for the filter dropdown
  const fetchAccounts = async () => {
    try {
      const response = await apiRequest<AccountsResponse>('/accounts');
      // Only show active accounts
      setAccounts(response.accounts.filter(account => account.is_active));
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // When pagination changes, fetch transactions again
  useEffect(() => {
    if (transactions.length > 0) {
      // Skip on first load
      fetchStoredTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  const fetchStoredTransactions = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};

      // Basic filters
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (searchTerm) params.search = searchTerm;

      // Advanced filters
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;
      if (categoryFilter) params.category = categoryFilter;
      if (accountFilter) params.accountId = accountFilter;
      if (transactionType !== 'all') params.type = transactionType;

      // Sorting
      params.sort = sortOrder;

      // Add pagination params
      params.page = currentPage.toString();
      params.limit = itemsPerPage.toString();

      const data = await apiRequest<TransactionsResponse>(
        '/transactions/stored',
        {
          params,
        }
      );

      setTransactions(data.transactions);
      setTotalCount(data.count);

      // Reset to page 1 if we're on a page with no results (except page 1 itself)
      if (data.transactions.length === 0 && currentPage > 1) {
        setCurrentPage(1);
      }

      // Clear selection when changing pages
      setSelectedTransactions(new Set());

      if (data.count === 0)
        
      showAlert(`No transactions found for your search criteria`, 'warning');

      console.log('Stored transactions:', data);
    } catch (error) {
      console.error('Error fetching stored transactions:', error);
      showAlert(`Failed to fetch transactions`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit button click
  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditValues({
      name: transaction.name,
      amount: transaction.amount,
      category: transaction.category.join(', '),
      date: transaction.date,
    });
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      setIsLoading(true);

      // Prepare the updated data
      const updatedData = {
        name: editValues.name,
        amount: parseFloat(editValues.amount.toString()),
        category: editValues.category.split(',').map((cat) => cat.trim()),
        date: editValues.date,
      };

      // Call the API to update the transaction
      await apiRequest(`/transactions/${editingTransaction._id}`, {
        method: 'PUT',
        body: updatedData,
      });

      // Refresh the transactions list
      await fetchStoredTransactions();

      // Reset editing state
      setEditingTransaction(null);
      showAlert('Updated transaction successfully','success');
    } catch (error) {
      console.error('Error updating transaction:', error);
      showAlert('Failed to update transaction','error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (id: string) => {
    // Confirm before deleting
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      setIsLoading(true);

      // Call the API to delete the transaction
      await apiRequest(`/transactions/${id}`, {
        method: 'DELETE',
      });

      // Refresh the transactions list
      await fetchStoredTransactions();

      showAlert('Transaction deleted successfully','success');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showAlert('Failed to delete transaction', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle transaction selection
  const toggleTransactionSelection = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  // Toggle all transactions selection
  const toggleAllTransactions = () => {
    if (selectedTransactions.size === transactions.length) {
      // Deselect all
      setSelectedTransactions(new Set());
    } else {
      // Select all
      const newSelected = new Set<string>();
      transactions.forEach((transaction) => {
        newSelected.add(transaction._id);
      });
      setSelectedTransactions(newSelected);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) {
      showAlert('No transactions selected','warning');
      return;
    }

    // Confirm before deleting
    if (
      !confirm(
        `Are you sure you want to delete ${selectedTransactions.size} transactions?`
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);

      // Delete each selected transaction sequentially
      const selectedIds = Array.from(selectedTransactions);
      for (const id of selectedIds) {
        await apiRequest(`/transactions/${id}`, {
          method: 'DELETE',
        });
      }

      // Clear selection
      setSelectedTransactions(new Set());

      // Refresh the transactions list
      await fetchStoredTransactions();

      showAlert(`${selectedIds.length} transactions deleted successfully`,'success');
    } catch (error) {
      console.error('Error deleting transactions:', error);
      showAlert('Failed to delete some transactions','error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open bulk edit mode
  const openBulkEdit = () => {
    if (selectedTransactions.size === 0) {
      showAlert('No transactions selected', 'warning');
      return;
    }

    setBulkEditMode(true);
    // Reset bulk edit values
    setBulkEditValues({
      name: '',
      amount: '',
      category: '',
      date: '',
    });
  };

  // Handle bulk edit save
  const handleBulkEditSave = async () => {
    if (selectedTransactions.size === 0) {
      showAlert('No transactions selected','warning');
      return;
    }

    try {
      setIsLoading(true);

      // Prepare the updated data - only include fields that were modified
      const updatedData: Record<string, string | number | string[]> = {};

      if (bulkEditValues.name) updatedData.name = bulkEditValues.name;
      if (bulkEditValues.amount)
        updatedData.amount = parseFloat(bulkEditValues.amount);
      if (bulkEditValues.category)
        updatedData.category = bulkEditValues.category
          .split(',')
          .map((cat) => cat.trim());
      if (bulkEditValues.date) updatedData.date = bulkEditValues.date;

      // If no fields were changed, show a message and return
      if (Object.keys(updatedData).length === 0) {
        showAlert('No changes to save','warning');
        setBulkEditMode(false);
        return;
      }

      // Update each selected transaction sequentially
      const selectedIds = Array.from(selectedTransactions);
      for (const id of selectedIds) {
        await apiRequest(`/transactions/${id}`, {
          method: 'PUT',
          body: updatedData,
        });
      }

      // Clear selection and exit bulk edit mode
      setSelectedTransactions(new Set());
      setBulkEditMode(false);

      // Refresh the transactions list
      await fetchStoredTransactions();

      showAlert(`${selectedIds.length} transactions updated successfully`,'success');
    } catch (error) {
      console.error('Error updating transactions:', error);
      showAlert('Failed to update some transactions','error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSelectedSum = () => {
    let sum = 0;
    transactions.forEach((transaction) => {
      if (selectedTransactions.has(transaction._id)) {
        sum += transaction.amount;
      }
    });
    return sum;
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
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column'}}>
        <h2>Transactions</h2>

        {/* Floating Bulk Actions */}
        {transactions.length > 0 && selectedTransactions.size > 0 && (
          <div style={style.floatingBulkActions}>
            <div style={style.selectedCount}>
              {selectedTransactions.size} transaction(s) selected
            </div>
            <div style={style.selectionTotal}>
              Total:{' '}
              <span
                style={
                  calculateSelectedSum() >= 0 ? style.positive : style.negative
                }
              >
                ${Math.abs(calculateSelectedSum()).toFixed(2)}
              </span>
            </div>
            <div style={style.bulkButtons}>
              <button
                onClick={openBulkEdit}
                style={style.editButton}
                disabled={selectedTransactions.size === 0 || isLoading}
              >
                <Edit size={20} />
              </button>
              <button
                onClick={handleBulkDelete}
                style={style.deleteButton}
                disabled={selectedTransactions.size === 0 || isLoading}
              >
                <Trash size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Search input */}
        <Card>
        <Box sx={style.container}>
          <Box sx={style.searchContainer}>
            <TextField
              label="Search Transactions:"
              size="small"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or merchant"
              fullWidth
            />
          </Box>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={style.datePickerContainer}>
              <Box sx={style.datePickerGroup}>
                <DatePicker
                  label="From Date"
                  value={fromDate ? dayjs(fromDate) : null}
                  onChange={(newValue) => setFromDate(newValue ? newValue.toISOString().slice(0, 10) : '')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                    },
                  }}
                />
              </Box>
              <Box sx={style.datePickerGroup}>
                <DatePicker
                  label="To Date"
                  value={toDate ? dayjs(toDate) : null}
                  onChange={(newValue) => setToDate(newValue ? newValue.toISOString().slice(0, 10) : '')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small',
                    },
                  }}
                />
              </Box>
            </Box>
          </LocalizationProvider>
          {/* Advanced Filters Toggle */}
          <Button
            variant="outlined"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            // sx={style.advancedFiltersToggle}
          >
            {showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setCurrentPage(1); // Reset to page 1 when applying new filters
              fetchStoredTransactions();
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Get Transactions'}
          </Button>
        </Box>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <Box sx={style.advancedFiltersContainer}>
            {/* Row 1: Min & Max Amount */}
            <Box sx={style.filterRow}>
              <FormControl sx={style.filterGroup} fullWidth size="small">
                <TextField
                  label="Min Amount"
                  type="number"
                  size="small"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="Min amount"
                />
              </FormControl>

              <FormControl sx={style.filterGroup} fullWidth size="small">
                <TextField
                  label="Max Amount"
                  type="number"
                  size="small"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="Max amount"
                />
              </FormControl>
            </Box>

            {/* Row 2: Category & Transaction Type */}
            <Box sx={style.filterRow}>
              <FormControl sx={style.filterGroup} fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {availableCategories.map((category, index) => (
                    <MenuItem key={index} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={style.filterGroup} fullWidth size="small">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={transactionType}
                  label="Transaction Type"
                  onChange={(e) => setTransactionType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="credit">Debit (Expense)</MenuItem>
                  <MenuItem value="debit">Credit (Income)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Row 3: Account & Sort By */}
            <Box sx={style.filterRow}>
              <FormControl sx={style.filterGroup} fullWidth size="small">
                <InputLabel>Account</InputLabel>
                <Select
                  value={accountFilter}
                  label="Account"
                  onChange={(e) => setAccountFilter(e.target.value)}
                >
                  <MenuItem value="">All Accounts</MenuItem>
                  {accounts.map((account) => (
                    <MenuItem key={account._id} value={account._id}>
                      {account.name} ({account.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={style.filterGroup} fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortOrder}
                  label="Sort By"
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                  <MenuItem value="largest">Largest Amount First</MenuItem>
                  <MenuItem value="smallest">Smallest Amount First</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}
        </Card>

        

        {transactions.length > 0 && (
          <Card style={{marginTop: 20}}>
            <table style={style.table}>
              <thead>
                <tr>
                  <th style={style.checkboxTh}>
                    <input
                      type="checkbox"
                      checked={
                        selectedTransactions.size === transactions.length &&
                        transactions.length > 0
                      }
                      onChange={toggleAllTransactions}
                    />
                  </th>
                  <th style={style.th}>Date</th>
                  <th style={style.th}>Name</th>
                  <th style={style.th}>Amount</th>
                  <th style={style.th}>Category</th>
                  <th style={style.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.transaction_id}
                    style={
                      selectedTransactions.has(transaction._id)
                        ? style.selectedRow
                        : {}
                    }
                  >
                    <td style={style.checkboxTd}>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction._id)}
                        onChange={() =>
                          toggleTransactionSelection(transaction._id)
                        }
                      />
                    </td>
                    <td style={style.td}>{transaction.date}</td>
                    <td style={style.td}>{transaction.name}</td>
                    <td style={style.td}>
                      <span
                        style={
                          transaction.amount < 0
                            ? style.positive
                            : style.negative
                        }
                      >
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </td>
                    <td style={style.td}>{transaction.category.join(', ')}</td>
                    <td style={style.td}>
                      <div style={style.actionButtonsContainer}>
                        <button
                          onClick={() => handleEditClick(transaction)}
                          style={style.editButton}
                          disabled={isLoading}
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteTransaction(transaction._id)
                          }
                          style={style.deleteButton}
                          disabled={isLoading}
                        >
                          <Trash size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div style={style.paginationContainer}>
              <div style={style.paginationInfo}>
                Showing{' '}
                {transactions.length > 0
                  ? (currentPage - 1) * itemsPerPage + 1
                  : 0}{' '}
                - {Math.min(currentPage * itemsPerPage, totalCount)} of{' '}
                {totalCount} transactions
              </div>

              <div style={style.itemsPerPageContainer}>
                <label style={style.paginationLabel}>Items per page:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newItemsPerPage = Number(e.target.value);
                    setItemsPerPage(newItemsPerPage);
                    e.target.disabled = true;
                    // Delay the page reset to allow the dropdown to close smoothly
                    setTimeout(() => {
                      setCurrentPage(1); // Reset to first page when items per page changes
                      e.target.disabled = false;
                    }, 300);
                  }}
                  style={style.itemsPerPageSelect}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={style.pageButtonsContainer}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isLoading}
                  style={style.pageButton}
                >
                  <ChevronsLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  style={style.pageButton}
                >
                  <ChevronLeft size={20} />
                </button>

                <span style={style.pageIndicator}>
                  Page {currentPage} of{' '}
                  {Math.ceil(totalCount / itemsPerPage) || 1}
                </span>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={
                    currentPage >= Math.ceil(totalCount / itemsPerPage) ||
                    isLoading
                  }
                  style={style.pageButton}
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.ceil(totalCount / itemsPerPage))
                  }
                  disabled={
                    currentPage >= Math.ceil(totalCount / itemsPerPage) ||
                    isLoading
                  }
                  style={style.pageButton}
                >
                  <ChevronsRight size={20} />
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Edit transaction modal */}
        {editingTransaction && (
          <div style={style.modalOverlay}>
            <div style={style.modalContent}>
              <h3 style={{ marginBottom: 10 }}>Edit Transaction</h3>

              <form
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit();
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date"
                    value={editValues.date ? dayjs(editValues.date) : null}
                    onChange={(newDate) =>
                      setEditValues({
                        ...editValues,
                        date: newDate ? newDate.format('YYYY-MM-DD') : '',
                      })
                    }
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>

                <TextField
                  label="Name"
                  variant="outlined"
                  size="small"
                  value={editValues.name}
                  onChange={(e) =>
                    setEditValues({ ...editValues, name: e.target.value })
                  }
                  fullWidth
                  required
                />

                <TextField
                  label="Amount"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  variant="outlined"
                  size="small"
                  value={editValues.amount}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      amount: parseFloat(e.target.value),
                    })
                  }
                  fullWidth
                  required
                />

                <TextField
                  label="Category (comma-separated)"
                  variant="outlined"
                  size="small"
                  value={editValues.category}
                  onChange={(e) =>
                    setEditValues({ ...editValues, category: e.target.value })
                  }
                  fullWidth
                />

                {/* Save / Cancel Buttons */}
                <Box display="flex" justifyContent="flex-end" gap={2} marginTop="20px">
                  <Button
                    variant="outlined"
                    onClick={() => setEditingTransaction(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              </form>
            </div>
          </div>
        )}

        {bulkEditMode && (
          <div style={style.modalOverlay}>
            <div style={style.modalContent}>
              <h3>Edit {selectedTransactions.size} Transactions</h3>
              <p style={style.bulkEditInfo}>
                Only fill in fields you want to change. Empty fields will not be
                updated.
              </p>

              <form
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBulkEditSave();
                }}
              >
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Date (optional)"
                    value={bulkEditValues.date ? dayjs(bulkEditValues.date) : null}
                    onChange={(newValue) =>
                      setBulkEditValues({
                        ...bulkEditValues,
                        date: newValue ? newValue.format('YYYY-MM-DD') : '',
                      })
                    }
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>

                <TextField
                  label="Name (optional)"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={bulkEditValues.name}
                  onChange={(e) =>
                    setBulkEditValues({ ...bulkEditValues, name: e.target.value })
                  }
                  placeholder="Leave empty to keep current names"
                />

                <TextField
                  label="Amount (optional)"
                  variant="outlined"
                  size="small"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  fullWidth
                  value={bulkEditValues.amount}
                  onChange={(e) =>
                    setBulkEditValues({ ...bulkEditValues, amount: e.target.value })
                  }
                  placeholder="Leave empty to keep current amounts"
                />

                <TextField
                  label="Category (optional, comma-separated)"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={bulkEditValues.category}
                  onChange={(e) =>
                    setBulkEditValues({ ...bulkEditValues, category: e.target.value })
                  }
                  placeholder="Leave empty to keep current categories"
                />

                {/* Buttons */}
                <Box display="flex" justifyContent="flex-end" gap={2} marginTop="20px">
                  <Button
                    variant="outlined"
                    onClick={() => setBulkEditMode(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Update All Selected'}
                  </Button>
                </Box>
              </form>
            </div>
          </div>
        )}
        </div>
      </Card>
    </div>
  );
}

const style = {
  selectionTotal: {
    fontWeight: 'bold',
    marginBottom: '8px',
    fontSize: '15px',
  },
  container: {
    display: 'flex',
    alignItems: 'left',
    gap: '20px',
  },
  actionButtonsContainer: {
    display: 'flex',
    gap: '5px',
  },
  editButton: {
    background: 'transparent',
    color: '#4CAF50',
    padding: '5px 10px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteButton: {
    background: 'transparent',
    color: '#DC3545',
    padding: '5px 10px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '14px',
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
    padding: '20px',
    borderRadius: '5px',
    minWidth: '300px',
    maxWidth: '500px',
    width: '100%',
  },
  formGroup: {
    marginBottom: '15px',
  },
  modalButtonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    color: '#333',
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  bulkActionsContainer: {
    display: 'flex-inline',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  floatingBulkActions: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    backgroundColor: '#fff',
    padding: '10px 15px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    zIndex: 1000,
  },
  // You can keep your existing selectedCount and bulkButtons style or adjust as needed
  selectedCount: {
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  bulkButtons: {
    display: 'flex',
    gap: '10px',
  },
  checkboxTh: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'center' as const,
    borderBottom: '2px solid #dee2e6',
    color: '#495057',
    width: '40px',
  },
  checkboxTd: {
    padding: '12px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #dee2e6',
    color: '#212529',
    width: '40px',
  },
  selectedRow: {
    backgroundColor: '#f0f7ff',
  },
  bulkEditInfo: {
    marginBottom: '15px',
    fontSize: '14px',
    color: '#666',
  },
  paginationContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
    padding: '10px 0',
    borderTop: '1px solid #dee2e6',
  },
  paginationInfo: {
    color: '#6c757d',
    fontSize: '14px',
  },
  itemsPerPageContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  paginationLabel: {
    color: '#6c757d',
    fontSize: '14px',
    margin: 0,
  },
  itemsPerPageSelect: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  pageButtonsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  pageButton: {
    padding: '4px 10px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    color: '#212529',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pageIndicator: {
    padding: '0 10px',
    color: '#6c757d',
    fontSize: '14px',
  },
  advancedFiltersToggle: {
    // backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    // padding: '8px 16px',
    // marginBottom: '15px',
    cursor: 'pointer',
    color: '#495057',
    fontSize: '14px',
    // width: '200px',
    // width: '100%',
    backgroundColor: 'white',
    width: 'auto',
    height: '40px',
    paddingLeft: '20px',
    paddingRight: '20px',
    marginTop: '10px',
    textAlign: 'center' as const,
  },
  advancedFiltersContainer: {
    paddingTop: '10px',
    alignItems: 'left',
    gap: '20px',
    borderRadius: '4px',
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '15px',
    marginBottom: '10px',
  },
  filterGroup: {
    flex: '1 1 45%',
    minWidth: '200px',
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
  },
  title: {
    fontSize: '24px',
    marginBottom: '30px',
    color: '#333',
  },
  subtitle: {
    fontSize: '20px',
    marginBottom: '15px',
    color: '#444',
  },
  section: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  searchContainer: {
    minWidth: '250px',
    // marginBottom: '20px',
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
    // marginBottom: '20px',
  },
  datePickerGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
  },
  label: {
    marginBottom: '5px',
    color: '#666',
  },
  input: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
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
  },
  fetchButton: {
    backgroundColor: '#0707e2',
    color: 'white',
    // padding: '12px 24px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    width: 'auto',
    height: '40px',
    paddingLeft: '20px',
    paddingRight: '20px',
    marginTop: '27px',
    // width: '100%',
  },
  dashboardButton: {
    backgroundColor: '#666',
    color: 'white',
    padding: '12px 24px',
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
  },
  th: {
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #dee2e6',
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
  },
  reconnectButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '0px 24px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#dc3545',
  },
};
