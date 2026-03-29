'use strict';

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// POST /api/email-capture
router.post('/', 
  body('email').isEmail().withMessage('Please enter a valid email address'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const email = req.body.email;
    // Here, you would typically save the email to a database
    // e.g., EmailModel.create({ email })
    
    return res.status(200).json({ message: 'Email captured successfully!', email });
});

module.exports = router;