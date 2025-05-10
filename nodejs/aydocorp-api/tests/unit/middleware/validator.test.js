const { validate } = require('../../../middleware/validation/validator');
const { body } = require('express-validator');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should call next() when validation passes', async () => {
    // Setup
    req.body = { name: 'Test User' };
    const validations = [
      body('name').notEmpty().withMessage('Name is required')
    ];

    // Execute
    await validate(validations)(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('should return 400 with errors when validation fails', async () => {
    // Setup
    req.body = { name: '' };
    const validations = [
      body('name').notEmpty().withMessage('Name is required')
    ];

    // Execute
    await validate(validations)(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: 'Name is required'
          })
        ])
      })
    );
  });
});