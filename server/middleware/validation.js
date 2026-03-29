'use strict';

/**
 * Validation middleware for email input.
 * Checks if the provided email is valid.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const validateEmail = (req, res, next) => {
    const email = req.body.email;
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    next();
};

module.exports = validateEmail;