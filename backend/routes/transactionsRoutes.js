const express = require('express');
const moment = require('moment');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { Transaction} = require('../models/Transaction.model');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only csv files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * @route GET /api/transactions/stored
 * @description Get stored transactions with optional date range filtering and search
 * @access Private
 */
router.get('/stored', auth, async (req, res) => {
  try {
    const { 
      fromDate, 
      toDate, 
      search, 
      page = 1, 
      limit = 10,
      minAmount,
      maxAmount,
      category,
      type,
      sort = 'newest'
    } = req.query;
    
    const userId = req.user._id;

    // Parse pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build query object
    const query = {
      user_id: userId,
    };

    // Add date range if provided
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) {
        query.date.$gte = moment(fromDate).format('YYYY-MM-DD');
      }
      if (toDate) {
        query.date.$lte = moment(toDate).format('YYYY-MM-DD');
      }
    }

    // Add search functionality if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // 'i' for case-insensitive
      query.$or = [{ merchant_name: searchRegex }, { name: searchRegex }];
    }
    
    // Add amount range filters
    if (minAmount !== undefined || maxAmount !== undefined) {
      query.amount = {};
      
      if (minAmount !== undefined) {
        // For expenses (negative values), we need to check that amount is LESS than -minAmount
        // For income (positive values), we need to check that amount is GREATER than minAmount
        query.amount.$gte = parseFloat(minAmount);
      }
      
      if (maxAmount !== undefined) {
        // For expenses (negative values), we need to check that amount is GREATER than -maxAmount
        // For income (positive values), we need to check that amount is LESS than maxAmount
        query.amount.$lte = parseFloat(maxAmount);
      }
    }
    
    // Add category filter
    if (category) {
      query.category = { $in: [category] };
    }
    
    // Add transaction type filter (credit/debit)
    if (type) {
      if (type === 'credit') {
        // Credit transactions have amount >= 0
        query.amount = { ...(query.amount || {}), $gte: 0 };
      } else if (type === 'debit') {
        // Debit transactions have amount < 0
        query.amount = { ...(query.amount || {}), $lt: 0 };
      }
    }

    // Count total matching transactions
    const totalCount = await Transaction.countDocuments(query);
    
    // Determine sort order
    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { date: 1 };
        break;
      case 'largest':
        sortOptions = { amount: -1 }; // Descending (largest first)
        break;
      case 'smallest':
        sortOptions = { amount: 1 }; // Ascending (smallest first)
        break;
      case 'newest':
      default:
        sortOptions = { date: -1 }; // Descending (newest first)
    }

    // Fetch transactions with pagination
    const transactions = await Transaction.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .exec();

    res.json({
      success: true,
      count: totalCount,
      page: pageNum,
      limit: limitNum,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching stored transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching transactions',
    });
  }
});

/**
 * @route POST /api/transactions/import-csv
 * @description Import transactions from a CSV file with column mapping
 * @access Private
 */
router.post('/import-csv', auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      error: 'No file uploaded' 
    });
  }

  try {
    const filePath = req.file.path;
    const mapping = req.body.mapping || {};
    const hasSeparateAmountColumns = req.body.hasSeparateAmountColumns === 'true';
    const accountId = req.body.accountId;
    
    // Validate account ID
    if (!accountId) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: 'No account selected for these transactions'
      });
    }
    
    // Validate that the account exists and belongs to the user
    const Account = require('../models/Account.model');
    const account = await Account.findOne({
      _id: accountId,
      user_id: req.user._id
    });
    
    if (!account) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: 'Invalid account selected'
      });
    }
    
    // Validate required mappings
    const requiredFields = ['date', 'name', 'category'];
    const missingFields = requiredFields.filter(field => !mapping[field]);
    
    // Check amount fields based on user selection
    if (hasSeparateAmountColumns) {
      if (!mapping.credit && !mapping.debit) {
        missingFields.push('credit or debit');
      }
    } else if (!mapping.amount) {
      missingFields.push('amount');
    }
    
    if (missingFields.length > 0) {
      // Delete the uploaded file
      fs.unlinkSync(filePath);
      
      return res.status(400).json({
        success: false,
        error: `Missing required column mappings: ${missingFields.join(', ')}`
      });
    }
    
    // Read and parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 1) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty or invalid'
      });
    }
    
    // All lines are data rows (no header)
    const dataRows = lines;
    
    // Parse selected rows from the request body
    let selectedRows = [];
    try {
      if (req.body.selectedRows) {
        selectedRows = JSON.parse(req.body.selectedRows);
        console.log('Selected rows:', selectedRows);
      }
    } catch (error) {
      console.error('Error parsing selectedRows:', error);
    }
    
    // If no rows are selected, return early with success but count=0
    if (selectedRows.length === 0) {
      fs.unlinkSync(filePath);
      return res.json({
        success: true,
        count: 0,
        skipped: 0,
        errors: 0,
        message: "No rows were selected for import"
      });
    }
    
    const errors = [];
    const transactionsToImport = [];
    let skippedCount = 0;
    
    console.log(`Processing ${selectedRows.length} selected rows for batch import`);
    
    // First pass: Parse rows and prepare transactions for batch processing
    for (let i = 0; i < dataRows.length; i++) {
      // Skip rows that aren't in the selectedRows array
      if (selectedRows.length > 0 && !selectedRows.includes(i)) {
        console.log(`Skipping row ${i} - not selected`);
        continue;
      }
      try {
        const row = dataRows[i].split(',').map(cell => cell.trim());
        
        // Skip empty rows
        if (row.length <= 1) {
          skippedCount++;
          continue;
        }
        
        // Map CSV columns to transaction model fields based on user selection
        const dateValue = row[mapping.date];
        const nameValue = row[mapping.name];
        const categoryValue = row[mapping.category];
        
        // Skip row if required fields are missing or empty
        if (!dateValue || dateValue.trim() === '' || 
            !nameValue || nameValue.trim() === '') {
          console.log(`Skipping row ${i+1} due to missing required fields`);
          skippedCount++;
          continue;
        }
        
        // Handle amount based on if separate columns are used
        let amount = 0;
        let hasValidAmount = false;
        
        if (hasSeparateAmountColumns) {
          // Handle credit column (positive amount)
          if (mapping.credit !== undefined && row[mapping.credit] && row[mapping.credit].trim() !== '') {
            const creditValue = row[mapping.credit].replace(/[$,]/g, ''); // Remove $ and commas
            const creditAmount = parseFloat(creditValue);
            if (!isNaN(creditAmount) && creditAmount > 0) {
              amount = creditAmount;
              hasValidAmount = true;
            }
          }
          
          // Handle debit column (negative amount)
          if (mapping.debit !== undefined && row[mapping.debit] && row[mapping.debit].trim() !== '') {
            const debitValue = row[mapping.debit].replace(/[$,]/g, ''); // Remove $ and commas
            const debitAmount = parseFloat(debitValue);
            if (!isNaN(debitAmount) && debitAmount > 0) {
              // Debit is positive in the CSV but should be negative in our system
              amount = -debitAmount;
              hasValidAmount = true;
            }
          }
        } else {
          // Single amount column
          if (row[mapping.amount] && row[mapping.amount].trim() !== '') {
            const amountValue = row[mapping.amount].replace(/[$,]/g, ''); // Remove $ and commas
            amount = parseFloat(amountValue);
            hasValidAmount = !isNaN(amount);
          }
        }
        
        // Skip row if no valid amount was found
        if (!hasValidAmount) {
          console.log(`Skipping row ${i+1} due to missing or invalid amount`);
          skippedCount++;
          continue;
        }
        
        // Generate a transaction object and add to batch array
        transactionsToImport.push({
          user_id: req.user._id,
          account_id: accountId, // Use the selected account ID
          amount: amount,
          date: moment(dateValue, ["MM/DD/YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"], true).isValid() ? 
            moment(dateValue, ["MM/DD/YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"], true).format('YYYY-MM-DD') : 
            moment().format('YYYY-MM-DD'),
          name: nameValue,
          category: categoryValue ? [categoryValue] : ['Uncategorized'],
          transaction_id: `csv-${uuidv4()}`, // Generate a unique ID
          iso_currency_code: account.currency || 'USD', // Use account currency
          transaction_type: (amount < 0) ? 'DEBIT' : 'CREDIT',
        });
        
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }
    
    // Second pass: Bulk save all valid transactions at once for better performance
    console.log(`Batch importing ${transactionsToImport.length} transactions...`);
    let importedCount = 0;
    
    if (transactionsToImport.length > 0) {
      // Use the new batch processing function instead of individual saves
      const { saveTransactionsBatch } = require('../models/Transaction.model');
      const batchResult = await saveTransactionsBatch(transactionsToImport, req.user._id);
      
      importedCount = batchResult.saved;
      skippedCount += batchResult.duplicates;
      
      console.log(`Batch import results: ${batchResult.saved} saved, ${batchResult.duplicates} duplicates, ${batchResult.errors} errors`);
    }
    
    // Delete the uploaded file
    fs.unlinkSync(filePath);
    
    // Return results
    res.json({
      success: true,
      count: importedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('CSV import error:', error);
    
    // Make sure to clean up the file if there's an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file: ' + error.message
    });
  }
});

/**
 * @route PUT /api/transactions/:id
 * @description Update a specific transaction
 * @access Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    // Find the transaction and make sure it belongs to the user
    const transaction = await Transaction.findOne({
      _id: id,
      user_id: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or access denied'
      });
    }

    // Only allow updating specific fields
    const allowedUpdates = ['name', 'category', 'amount', 'date'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Add transaction_type field if amount is changed
    if (updateData.amount !== undefined) {
      updateData.transaction_type = updateData.amount < 0 ? 'DEBIT' : 'CREDIT';
    }

    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating transaction'
    });
  }
});

/**
 * @route DELETE /api/transactions/:id
 * @description Delete a specific transaction
 * @access Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find the transaction and make sure it belongs to the user
    const transaction = await Transaction.findOne({
      _id: id,
      user_id: userId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or access denied'
      });
    }

    // Delete the transaction
    await Transaction.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error deleting transaction'
    });
  }
});

/**
 * @route GET /api/transactions/categories
 * @description Get all unique categories from user's transactions
 * @access Private
 */
router.get('/categories', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all unique categories across all user's transactions
    const transactions = await Transaction.find({ user_id: userId });
    
    // Extract all categories (they are stored as arrays)
    let allCategories = [];
    transactions.forEach(transaction => {
      if (transaction.category && Array.isArray(transaction.category)) {
        allCategories = [...allCategories, ...transaction.category];
      }
    });
    
    // Remove duplicates and filter out empty categories
    const uniqueCategories = [...new Set(allCategories)].filter(cat => cat && cat.trim() !== '');
    
    // Sort alphabetically
    uniqueCategories.sort();
    
    res.json({
      success: true,
      categories: uniqueCategories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error fetching categories'
    });
  }
});

module.exports = router;
