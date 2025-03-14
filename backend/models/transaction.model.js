const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    address: String,
    city: String,
    country: String,
    lat: Number,
    lon: Number,
    postal_code: String,
    region: String,
    store_number: String,
  },
  { _id: false }
);

const paymentMetaSchema = new mongoose.Schema(
  {
    by_order_of: String,
    payee: String,
    payer: String,
    payment_method: String,
    payment_processor: String,
    ppd_id: String,
    reason: String,
    reference_number: String,
  },
  { _id: false }
);

const personalFinanceCategorySchema = new mongoose.Schema(
  {
    confidence_level: String,
    detailed: String,
    primary: String,
  },
  { _id: false }
);

const counterpartySchema = new mongoose.Schema(
  {
    confidence_level: String,
    entity_id: String,
    logo_url: String,
    name: String,
    phone_number: String,
    type: String,
    website: String,
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  account_id: {
    type: String,
    required: true,
  },
  account_owner: String,
  amount: {
    type: Number,
    required: true,
  },
  authorized_date: String,
  authorized_datetime: String,
  category: {
    type: [String],
    required: true,
  },
  category_id: String,
  check_number: String,
  counterparties: [counterpartySchema],
  date: {
    type: String,
    required: true,
  },
  datetime: String,
  iso_currency_code: {
    type: String,
    required: true,
  },
  location: locationSchema,
  logo_url: String,
  merchant_entity_id: String,
  merchant_name: String,
  name: String,
  payment_channel: String,
  payment_meta: paymentMetaSchema,
  pending: {
    type: Boolean,
    default: false,
  },
  pending_transaction_id: String,
  personal_finance_category: personalFinanceCategorySchema,
  personal_finance_category_icon_url: String,
  transaction_code: String,
  transaction_id: {
    type: String,
    required: true,
    unique: true,
  },
  transaction_type: {
    type: String,
    required: true,
  },
  unofficial_currency_code: String,
  website: String,
});

// Create the Transaction model
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Internal function to save transaction data
const saveTransaction = async (transactionData, userId) => {
  try {
    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({
      transaction_id: transactionData.transaction_id,
    });

    if (existingTransaction) {
      console.log(
        'Transaction already exists:',
        transactionData.transaction_id
      );
      return null;
    }

    // Create and save new transaction
    const transaction = new Transaction({
      ...transactionData,
      user_id: userId,
    });
    await transaction.save();
    console.log('Transaction saved successfully:', transaction);
    return transaction;
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
};

module.exports = {
  Transaction,
  saveTransaction,
};
