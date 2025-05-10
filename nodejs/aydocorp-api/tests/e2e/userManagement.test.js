const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');

describe('User Management E2E Tests', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;
  let testUserId;

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

    // Create admin user
    const adminData = {
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    };

    // Register admin user
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminData);

    adminUser = adminResponse.body.user;
    adminToken = adminResponse.body.token;

    // Create regular user
    const userData = {
      username: 'regularuser',
      email: 'regular@example.com',
      password: 'password123'
    };

    // Register regular user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    regularUser = userResponse.body.user;
    regularToken = userResponse.body.token;

    // Manually set admin role for admin user (since registration doesn't allow setting role)
    await User.findByIdAndUpdate(adminUser.id, { role: 'admin' });
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    
    // Close database connection
    await mongoose.connection.close();
  });

  describe('User Management Flow', () => {
    it('should allow admin to view all users', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2); // At least admin and regular user
    });

    it('should not allow regular user to view all users', async () => {
      await request(app)
        .get('/api/auth/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should allow admin to create a new user', async () => {
      const newUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create user through registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .expect(200);

      testUserId = response.body.user.id;
      expect(response.body.user).toHaveProperty('username', newUserData.username);
    });

    it('should allow admin to view user details', async () => {
      const response = await request(app)
        .get(`/api/auth/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });

    it('should not allow regular user to view user details', async () => {
      await request(app)
        .get(`/api/auth/users/${testUserId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    it('should allow admin to update user details', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/api/auth/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('username', updateData.username);
      expect(response.body).toHaveProperty('email', updateData.email);
    });

    it('should allow admin to make a user an admin', async () => {
      const response = await request(app)
        .post(`/api/auth/users/${testUserId}/make-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('role', 'admin');
    });

    it('should allow admin to remove admin rights', async () => {
      const response = await request(app)
        .post(`/api/auth/users/${testUserId}/remove-admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('role', 'employee');
    });

    it('should allow admin to reset user password', async () => {
      const response = await request(app)
        .post(`/api/auth/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password has been reset successfully');

      // Verify user can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'updateduser',
          password: 'noob1' // Default reset password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });
  });
});