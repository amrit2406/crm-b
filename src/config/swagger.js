const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const env = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM Sales Management System API',
      version: '1.0.0',
      description: 'RESTful API backend for CRM Sales Management System'
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Bearer token in the format: Bearer <token>'
        }
      }
    }
  },
  apis: [
    path.join(__dirname, '../routes/*.js').replace(/\\/g, '/'),
    './src/routes/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
