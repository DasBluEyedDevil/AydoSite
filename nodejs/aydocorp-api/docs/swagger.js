const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AydoCorp API',
      version: '1.0.0',
      description: 'API documentation for AydoCorp application',
      contact: {
        name: 'AydoCorp Support',
        email: 'support@aydocorp.space'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  // Path to the API docs
  apis: [
    './routes/features/**/*.js', // All route files
    './middleware/validation/*.js', // Validation schemas
    './models/*.js' // Models for schema definitions
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Configure Swagger middleware
 * @param {Express} app - Express application
 */
function setupSwagger(app) {
  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger documentation available at /api-docs');
}

module.exports = { setupSwagger };