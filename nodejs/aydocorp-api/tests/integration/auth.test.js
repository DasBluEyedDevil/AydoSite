const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('Auth Routes', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aydocorp-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    
    // Clear users collection
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', userData.username);
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Save user for later tests
      testUser = response.body.user;
      authToken = response.body.token;
    });

    it('should return 400 if username is already taken', async () => {
      const userData = {
        username: 'testuser',
        email: 'another@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Username already taken');
    });

    it('should return 400 if email is already taken', async () => {
      const userData = {
        username: 'anotheruser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should return 400 if validation fails', async () => {
      const userData = {
        username: 'ab', // Too short
        email: 'invalid-email',
        password: 'short'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', loginData.username);
    });

    it('should return 400 if credentials are invalid', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should return 400 if validation fails', async () => {
      const loginData = {
        username: '',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('GET /api/auth/validate', () => {
    it('should return user data for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('username', testUser.username);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      await request(app)
        .get('/api/auth/validate')
        .expect(401);
    });

    it('should return 401 if token is invalid', async () => {
      await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });
});