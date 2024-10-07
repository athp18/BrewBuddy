// backend/src/routes/users.js

const express = require('express');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const User = require('../models/User');

// @route   POST /api/users
// @desc    Register user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Include a valid email').isEmail(),
    check('password', 'Enter a password with 6 or more characters').isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    // Validation code...
  }
);

module.exports = router;