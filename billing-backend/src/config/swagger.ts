import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Billing System API',
      version: '1.0.0',
      description: 'Comprehensive billing system for retailers with AI features',
      contact: {
        name: 'API Support',
        email: 'support@billingsystem.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server',
      },
      {
        url: 'https://api.billingsystem.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'RETAIL_OWNER', 'MANAGER', 'CASHIER', 'VIEWER'],
            },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
            },
          },
        },
        Business: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            slug: {
              type: 'string',
            },
            businessType: {
              type: 'string',
            },
            isActive: {
              type: 'boolean',
            },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            customerCode: {
              type: 'string',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            phone: {
              type: 'string',
            },
            outstandingBalance: {
              type: 'number',
            },
            totalPurchases: {
              type: 'number',
            },
            isActive: {
              type: 'boolean',
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            productCode: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            unit: {
              type: 'string',
              enum: ['KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE', 'DOZEN', 'METER', 'FEET', 'BOX', 'BUNDLE'],
            },
            purchasePrice: {
              type: 'number',
            },
            sellingPrice: {
              type: 'number',
            },
            currentStock: {
              type: 'number',
            },
            isActive: {
              type: 'boolean',
            },
          },
        },
        Bill: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            billNumber: {
              type: 'string',
            },
            billDate: {
              type: 'string',
              format: 'date-time',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'],
            },
            totalAmount: {
              type: 'number',
            },
            paidAmount: {
              type: 'number',
            },
            balanceAmount: {
              type: 'number',
            },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            paymentNumber: {
              type: 'string',
            },
            paymentDate: {
              type: 'string',
              format: 'date-time',
            },
            amount: {
              type: 'number',
            },
            method: {
              type: 'string',
              enum: ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DIGITAL_WALLET'],
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/schemas/*.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
export { swaggerUi };