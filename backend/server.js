const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const plaidRoutes = require('./routes/plaidRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const goalsRoutes = require('./routes/goalsRoutes');

const accountRoutes = require('./routes/accountRoutes');
const analysisRoutes = require('./routes/analysisRoutes');

require('dotenv').config({ path: '.env' });
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cors());
app.use(cookieParser());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));
  
const {
  Configuration,
  PlaidApi,
  Products,
  PlaidEnvironments,
} = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(configuration);

// Make the Plaid client available to routes via app.locals
app.locals.plaidClient = client;

// Routes
app.use('/api/users', userRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/goals', goalsRoutes); // Register goals routes

app.use('/api/accounts', accountRoutes);
app.use('/api/analytics', analysisRoutes)

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = { app };