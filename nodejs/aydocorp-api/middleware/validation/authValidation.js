const { body } = require('express-validator');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: User's username
 *         email:
 *           type: string
 *           format: email
 *           description: User's email
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *         role:
 *           type: string
 *           enum: [user, employee, admin]
 *           description: User's role
 */

// Validation for user registration
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Validation for user login
const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
];

// Validation for password reset request
const passwordResetRequestValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
];

// Validation for password reset
const passwordResetValidation = [
  body('password')
    .trim()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Validation for user update
const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
];

module.exports = {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  updateUserValidation
};