'use client';

import {
  CSVImportResponse,
  uploadFile,
  apiRequest,
  Account,
  AccountsResponse,
} from '@/app/assets/utilities/API_HANDLER';
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@mui/material';

import AlertBanner from '@/app/components/AlertBanner';

interface CSVImportFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CSVImportForm: React.FC<CSVImportFormProps> = ({
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  // Track actual data row indices (0-based, relative to the file after header) rather than UI indices
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Track total data rows in file
  const [totalRows, setTotalRows] = useState<number>(0);


  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>('success');
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
  };
 

  // Transaction fields
  const requiredFields = ['date', 'name', 'category'];
  const [hasSeparateAmountColumns, setHasSeparateAmountColumns] =
    useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = useCallback(
    (selectedFile: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((line) => line.trim() !== '');
        if (lines.length === 0) {
          setError('CSV file appears to be empty');
          return;
        }
        // All lines are data rows (no header)
        const data = lines.map((line) =>
          line.split(',').map((cell) => cell.trim())
        );

        // Assume first row is header
        const hasHeader = true;
        const headerRow = hasHeader ? data[0] : [];
        const dataRows = hasHeader ? data.slice(1) : data;

        // Set total rows in the file
        setTotalRows(dataRows.length);

        const previewData = showAllRows
          ? data
          : data.slice(0, Math.min(6, data.length));
        setPreview(previewData);

        // Select all rows by default
        const newSelected = new Set<number>();
        // For each row in the preview, add its file index to selected rows
        for (let i = 0; i < dataRows.length; i++) {
          // If showing all rows, then preview indices match file indices
          // If showing limited rows, we're showing the first N rows from the file
          newSelected.add(i);
        }
        setSelectedRows(newSelected);
      };
      reader.readAsText(selectedFile);
    },
    [showAllRows]
  );

  const handleSelectAll = () => {
    // If all rows are currently selected
    if (selectedRows.size === totalRows) {
      // Deselect all rows
      setSelectedRows(new Set());
    } else {
      // Select all rows
      const newSelected = new Set<number>();

      // Add each row by its file index
      for (let i = 0; i < totalRows; i++) {
        newSelected.add(i);
      }
      setSelectedRows(newSelected);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    // Toggle selection state of the row
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return;

    // Validate that all required fields have been mapped
    const missingFields = requiredFields.filter(
      (field) => mapping[field] === undefined
    );

    if (hasSeparateAmountColumns) {
      if (mapping.credit === undefined && mapping.debit === undefined) {
        missingFields.push('credit or debit');
      }
    } else if (mapping.amount === undefined) {
      missingFields.push('amount');
    }

    if (missingFields.length > 0) {
      setError(`Please map these required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate that an account is selected
    if (!selectedAccount) {
      setError('Please select an account for these transactions');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Add mapping data
      Object.entries(mapping).forEach(([field, columnIndex]) => {
        formData.append(`mapping[${field}]`, columnIndex.toString());
      });

      formData.append(
        'hasSeparateAmountColumns',
        hasSeparateAmountColumns.toString()
      );

      // selectedRows already contains the actual file indices of selected rows
      // so we can send them directly to the backend
      formData.append('selectedRows', JSON.stringify(Array.from(selectedRows)));

      // Add the selected account ID
      formData.append('accountId', selectedAccount);

      const result = await uploadFile<CSVImportResponse>(
        '/transactions/import-csv',
        formData
      );

      if (result.success) {
        if (result.errors > 0 || result.skipped > 0) {
          showAlert(
            `Imported ${result.count} transactions.\n` +
              `${
                result.skipped > 0
                  ? `Skipped ${result.skipped} rows (missing required fields).\n`
                  : ''
              }` +
              `${
                result.errors > 0
                  ? `Encountered ${result.errors} errors during import.`
                  : ''
              }`
          );
        } else {
          showAlert(`Successfully imported ${result.count} transactions`,'success');
        }
        onSuccess();
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      setError('Failed to import transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === 'text/csv' ||
        droppedFile.name.endsWith('.csv')
      ) {
        setFile(droppedFile);
        processFile(droppedFile);
      } else {
        setError('Please upload a CSV file');
      }
    }
  };

  // When user toggles showing all rows, reprocess the file
  useEffect(() => {
    if (file) {
      processFile(file);
    }
  }, [showAllRows, file, processFile]);

  // Fetch available accounts when component mounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await apiRequest<AccountsResponse>('/accounts');
        // Filter for active accounts only
        const activeAccounts = response.accounts.filter(
          (account) => account.is_active
        );
        setAccounts(activeAccounts);

        // Set default account if available
        if (activeAccounts.length > 0) {
          setSelectedAccount(activeAccounts[0]._id);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        setError('Failed to load accounts. Please try again later.');
      }
    };

    fetchAccounts();
  }, []);

  return (
  
    <div style={styles.container}>
       {alertMessage && (
        <AlertBanner
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage(null)}
        />
      )}
      <h3>Import Transactions from CSV</h3>

      {!file ? (
        <div
          style={styles.uploadArea}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={styles.fileInput}
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input">
            <Button variant="contained" component="span" color="primary">
              Select a CSV file
            </Button>
          </label>
          <p>or drag and drop a CSV file here</p>
        </div>
      ) : (
        <div>
          <p>
            Please tell us which column in your CSV contains each transaction
            property:
          </p>
          <br />

          {preview.length > 0 && (
            <>
              {/* Select/Deselect All button */}
              <button onClick={handleSelectAll} style={styles.whiteButton}>
                {selectedRows.size === totalRows
                  ? 'Deselect All'
                  : 'Select All Rows'}
              </button>

              <div style={styles.previewTable}>
                <table style={styles.table}>
                  <tbody>
                    {preview.map((row, i) => {
                      return (
                        <tr key={i}>
                          <td style={styles.td}>
                            <input
                              type="checkbox"
                              checked={selectedRows.has(i)}
                              onChange={() => toggleRowSelection(i)}
                            />
                          </td>
                          {row.map((cell, j) => (
                            <td key={j} style={styles.td}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setShowAllRows(!showAllRows)}
                style={styles.whiteButton}
              >
                {showAllRows ? 'Show Fewer Rows' : 'Show All Rows'}
              </button>

              <div style={styles.amountToggle}>
                <label>
                  <input
                    type="checkbox"
                    checked={hasSeparateAmountColumns}
                    onChange={(e) => {
                      setHasSeparateAmountColumns(e.target.checked);
                      // Clear amount mappings when toggling
                      const newMapping = { ...mapping };
                      delete newMapping.amount;
                      delete newMapping.credit;
                      delete newMapping.debit;
                      setMapping(newMapping);
                    }}
                  />
                  &nbsp; My CSV has separate columns for credits and debits
                </label>
              </div>

              {/* Account Selection */}
              <div style={styles.accountSelection}>
                <h4>Select Account</h4>
                <p>Choose which account these transactions belong to:</p>

                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  style={styles.accountSelect}
                >
                  <option value="">Select an Account</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({account.type}) - {account.currency}
                    </option>
                  ))}
                </select>

                <div style={styles.accountNote}>
                  <p>
                    Don't see your account?{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        // You could open a modal here to create a new account
                        showAlert(
                          'Click on "Close Import" button, then click on "Create Account" button on this page '
                        ,'warning');
                      }}
                    >
                      Create a new account
                    </a>
                  </p>
                </div>
              </div>

              <div style={styles.mappingContainer}>
                {requiredFields.map((field) => (
                  <div key={field} style={styles.mappingItem}>
                    <label style={styles.label}>{field}: </label>
                    <select
                      value={
                        mapping[field] !== undefined
                          ? mapping[field].toString()
                          : ''
                      }
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          [field]: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      style={styles.select}
                    >
                      <option value="">Select column</option>
                      {preview.length > 0 &&
                        preview[0].map((cell, i) => (
                          <option key={i} value={i}>
                            {i + 1}. {cell}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}

                {/* Conditional amount fields based on user selection */}
                {hasSeparateAmountColumns ? (
                  <>
                    <div style={styles.mappingItem}>
                      <label style={styles.label}>credit: </label>
                      <select
                        value={
                          mapping.credit !== undefined
                            ? mapping.credit.toString()
                            : ''
                        }
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            credit: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        style={styles.select}
                      >
                        <option value="">Select column</option>
                        {preview[0].map((header, i) => (
                          <option key={i} value={i}>
                            {1 + i}.{header}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.mappingItem}>
                      <label style={styles.label}>debit: </label>
                      <select
                        value={
                          mapping.debit !== undefined
                            ? mapping.debit.toString()
                            : ''
                        }
                        onChange={(e) =>
                          setMapping({
                            ...mapping,
                            debit: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        style={styles.select}
                      >
                        <option value="">Select column</option>
                        {preview[0].map((header, i) => (
                          <option key={i} value={i}>
                            {1 + i}.{header}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div style={styles.mappingItem}>
                    <label style={styles.label}>Amount: </label>
                    <select
                      value={
                        mapping.amount !== undefined
                          ? mapping.amount.toString()
                          : ''
                      }
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          amount: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      style={styles.select}
                    >
                      <option value="">Select column</option>
                      {preview.length > 0 &&
                        preview[0].map((cell, i) => (
                          <option key={i} value={i}>
                            {i + 1}. {cell.substring(0, 20)}
                            {cell.length > 20 ? '...' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.buttonGroup}>
            <button onClick={onClose} style={styles.whiteButton}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              style={styles.importButton}
              disabled={isProcessing}
            >
              {isProcessing ? 'Importing...' : 'Import Transactions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {


  container: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginTop: '20px',
    marginBottom: '20px',
  },
  uploadArea: {
    border: '2px dashed #ccc',
    borderRadius: '4px',
    padding: '40px',
    textAlign: 'center' as const,
    cursor: 'pointer',
  },
  fileInput: {
    display: 'none',
  },
  fileInputLabel: {
    backgroundColor: '#0066cc',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'inline-block',
    marginBottom: '10px',
  },
  previewTable: {
    overflowX: 'auto' as const,
    maxHeight: '300px',
    marginBottom: '10px',
    marginTop: '10px',
    border: '1px solid #ddd',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    backgroundColor: '#f8f9fa',
    padding: '8px',
    textAlign: 'left' as const,
    borderBottom: '2px solid #ddd',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: '8px',
    borderBottom: '1px solid #ddd',
    borderLeft: '1px solid #ddd',
  },
  mappingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '20px',
    marginTop: '20px',
  },
  mappingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    width: '80px',
    textTransform: 'capitalize',
  },
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    flex: 1,
  },
  amountToggle: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    marginTop: '5px',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  importButton: {
    backgroundColor: '#0066cc',
    color: 'white',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  whiteButton: {
    backgroundColor: '#f5f5f5',
    color: '#333',
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    marginBottom: '10px',
  },
  accountSelection: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  accountSelect: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '16px',
    marginTop: '10px',
  },
  accountNote: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#666',
  },
};

export default CSVImportForm;
