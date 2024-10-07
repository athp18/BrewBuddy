// backend/src/app.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./utils/db');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect Database
connectDB();

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/coffee-shops', require('./routes/coffeeShops'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).send('Server Error');
});

module.exports = app;