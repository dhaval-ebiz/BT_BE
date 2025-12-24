# Billing System Backend

A comprehensive billing system for retailers built with TypeScript, Express.js, PostgreSQL, Redis, and AI features.

## 🚀 Features

### Core Features
- **User Management**: Registration, authentication, roles & permissions
- **Business Management**: Multi-tenant support, staff management
- **Customer Management**: Customer profiles, credit limits, payment tracking
- **Merchant Management**: Supplier management, payment tracking
- **Product Management**: Categories, units (kg, liters, pieces), stock management
- **Billing System**: Invoice generation, payment processing, partial payments
- **Dashboard Analytics**: Revenue tracking, top customers, sales reports

### Advanced Features
- **AI Integration**: 
  - Text-to-SQL with safety guardrails
  - AI banner generation for festivals/offers
  - AI text generation for marketing
- **Communication**: 
  - WhatsApp messaging
  - SMS notifications  
  - Email notifications
- **File Management**: S3 integration for images, documents, videos
- **Background Jobs**: BullMQ for async processing
- **Security**: JWT authentication, rate limiting, input validation
- **Monitoring**: Comprehensive logging, performance metrics

## 🛠 Technology Stack

- **Runtime**: Bun.js (with Node.js compatibility)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Cache/Queue**: Redis with BullMQ
- **Authentication**: JWT tokens with refresh tokens
- **File Storage**: AWS S3
- **AI**: OpenAI GPT-4 and DALL-E 3
- **Documentation**: Swagger/OpenAPI 3.0

## 📁 Project Structure

```
src/
├── config/           # Database, Redis, Swagger configuration
├── controllers/      # Request/response handlers
├── middleware/       # Authentication, validation, rate limiting
├── models/           # Database schema (Drizzle)
├── queues/           # BullMQ queue definitions
├── routes/           # API route definitions
├── schemas/          # Zod validation schemas
├── services/         # Business logic layer
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (email, SMS, S3, etc.)
└── index.ts          # Application entry point
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ or Bun.js
- PostgreSQL 16+
- Redis 7+

### Setup

1. **Clone and install dependencies:**
```bash
cd billing-backend
bun install  # or npm install
```

2. **Environment Configuration:**
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Required environment variables:
- `DB_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT secret key
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket name
- `OPENAI_API_KEY` - OpenAI API key (for AI features)
- `TWILIO_ACCOUNT_SID` - Twilio account SID (for SMS)
- `TWILIO_AUTH_TOKEN` - Twilio auth token

3. **Start with Docker Compose:**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis server
- Redis Commander (GUI for Redis)
- pgAdmin (GUI for PostgreSQL)
- Application server

4. **Database Migration:**
```bash
bun db:generate  # Generate migration files
bun db:migrate   # Run migrations
```

5. **Access the Application:**
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs
- pgAdmin: http://localhost:5050
- Redis Commander: http://localhost:8081

## 📚 API Documentation

The API documentation is automatically generated using Swagger/OpenAPI. Access it at:
- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - User logout

#### Business Management
- `GET /api/business` - Get user's businesses
- `POST /api/business` - Create business
- `GET /api/business/:id` - Get business details
- `PUT /api/business/:id` - Update business

#### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer
- `PUT /api/customers/:id` - Update customer
- `POST /api/customers/:id/payments` - Add payment

#### Billing
- `GET /api/billing` - List bills
- `POST /api/billing` - Create bill
- `GET /api/billing/:id` - Get bill details
- `POST /api/billing/:id/payments` - Add payment to bill
- `POST /api/billing/:id/send` - Send bill via SMS/Email/WhatsApp

#### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/categories` - Get categories
- `POST /api/products/:id/stock` - Adjust stock

#### AI Features
- `POST /api/ai/banner` - Generate AI banner
- `POST /api/ai/sql` - Generate SQL from natural language
- `POST /api/ai/text` - Generate text content
- `POST /api/ai/sql/execute` - Execute SQL with safety checks

#### File Upload
- `POST /api/files/upload` - Upload single file
- `POST /api/files/upload-multiple` - Upload multiple files
- `GET /api/files/:key` - Get file
- `DELETE /api/files/:key` - Delete file

## 🔐 Authentication

The system uses JWT tokens for authentication:

1. **Access Token**: Short-lived (15 minutes) for API access
2. **Refresh Token**: Long-lived (7 days) for getting new access tokens

Include the access token in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```

## 🛡 Security Features

- **Password Security**: Bcrypt hashing with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Request rate limiting by IP and user
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Helmet security headers
- **CORS Configuration**: Controlled cross-origin access
- **Role-Based Access Control**: Granular permissions

## 📊 Monitoring & Logging

The system includes comprehensive monitoring:

- **Request Logging**: All API requests with timing
- **Error Logging**: Structured error logs with context
- **Performance Monitoring**: Database query timing, slow request detection
- **Security Logging**: Authentication events, failed attempts
- **Background Job Logging**: BullMQ job status tracking

Log files are stored in the `logs/` directory:
- `combined.log` - General application logs
- `error.log` - Error logs
- `database.log` - Database query logs
- `auth.log` - Authentication logs
- `performance.log` - Performance metrics
- `jobs.log` - Background job logs

## 🤖 AI Features

### Text-to-SQL
Convert natural language queries to SQL with safety guardrails:
```javascript
// Example: "Show me all customers who owe more than 1000"
// Generates: SELECT * FROM customers WHERE businessId = '...' AND outstandingBalance > 1000
```

### AI Banner Generation
Generate promotional banners using DALL-E 3:
```javascript
POST /api/ai/banner
{
  "prompt": "Diwali sale banner with lights and discounts"
}
```

### AI Text Generation
Generate marketing copy, descriptions, and more:
```javascript
POST /api/ai/text
{
  "prompt": "Write a product description for iron rods",
  "style": "professional"
}
```

## 📱 Communication Features

### WhatsApp Integration
Send bills, payment confirmations, and reminders via WhatsApp Business API.

### SMS Integration
SMS notifications using Twilio for:
- Bill delivery
- Payment confirmations
- Overdue reminders
- Low stock alerts

### Email Integration
HTML email support with:
- Bill PDF attachments
- Payment receipts
- Welcome messages
- Password reset emails

## 🗄 Database Schema

### Key Tables
- **users**: User accounts with roles
- **retail_businesses**: Business profiles
- **business_staff**: Staff members and permissions
- **customers**: Customer profiles and balances
- **merchants**: Supplier/vendor profiles
- **products**: Product catalog with units
- **bills**: Invoices and billing information
- **payments**: Payment transactions
- **messages**: Communication history
- **ai_generated_content**: AI-generated content history

## 🚀 Performance Optimizations

- **Database Connection Pooling**: Efficient PostgreSQL connections
- **Redis Caching**: Session storage and caching
- **BullMQ Queues**: Async processing for heavy tasks
- **Compression**: Gzip compression for responses
- **Rate Limiting**: Prevent abuse and ensure stability
- **Database Indexing**: Optimized queries

## 🔧 Development

### Scripts
```bash
bun dev          # Start development server with hot reload
bun build        # Build for production
bun start        # Start production server
bun test         # Run tests
bun db:generate  # Generate database migrations
bun db:migrate   # Run database migrations
bun db:studio    # Open Drizzle Studio
```

### Testing
```bash
bun test
```

### Linting & Formatting
```bash
bun lint         # ESLint
bun format       # Prettier
```

## 🐳 Docker Support

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker build -t billing-backend .
docker run -p 3000:3000 billing-backend
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support, please contact:
- Email: support@billingsystem.com
- Documentation: http://localhost:3000/api-docs

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by best practices in software architecture
- Designed for scalability and maintainability

---

**Note**: This is a comprehensive backend system. For production use, ensure you:
- Use HTTPS
- Implement proper backup strategies
- Set up monitoring and alerting
- Configure proper CORS policies
- Use environment-specific configurations
- Implement proper error reporting