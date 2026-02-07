# NudgePay Backend - Production-Ready API

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
# Execute schema.sql in your Supabase SQL editor

# Start development server
npm run dev

# Start production server
npm start
```

## 📋 Features

### ✅ Complete Backend Functionality
- **Authentication**: JWT-based auth with bcrypt password hashing
- **CSV Upload**: Handles messy data with intelligent column detection
- **AI Email Generation**: OpenAI GPT-4 generates personalized emails
- **Automatic Email Sending**: Nodemailer sends emails automatically
- **Cron Job**: Daily automatic invoice chasing at 9 AM
- **Database**: Supabase/PostgreSQL with proper schema
- **Error Handling**: Comprehensive error handling and logging

## 🛠️ Tech Stack

- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + bcrypt
- **AI**: OpenAI GPT-4
- **Email**: Nodemailer
- **CSV**: PapaParse
- **Cron**: node-cron
- **Validation**: express-validator

## 📁 Project Structure

```
payme-backend/
├── config/
│   └── database.js          # Supabase connection
├── middleware/
│   └── auth.js              # JWT authentication
├── routes/
│   ├── auth.js              # Register/Login
│   └── invoices.js          # Invoice CRUD + Email
├── services/
│   ├── emailGenerator.js    # OpenAI email generation
│   └── emailSender.js       # Nodemailer email sending
├── utils/
│   └── csvParser.js         # CSV parsing + validation
├── cron/
│   └── invoiceChaser.js     # Daily auto-chasing
├── uploads/                 # Temporary CSV uploads
├── schema.sql               # Database schema
├── server.js                # Main Express server
└── .env                     # Environment variables
```

## 🔧 Environment Variables

Required variables in `.env`:

```env
# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-...

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Cron (9 AM daily)
CRON_SCHEDULE=0 9 * * *
```

## 📊 Database Setup

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and keys to `.env`
3. Run the SQL in `schema.sql` in Supabase SQL Editor

**Tables**:
- `users` - User accounts
- `invoices` - Invoice data with status tracking
- `email_logs` - Email sending history

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Invoices
- `POST /api/invoices/upload` - Upload CSV file
- `GET /api/invoices` - Get all user invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices/:id/send-email` - Generate & send email
- `PATCH /api/invoices/:id/paid` - Mark as paid
- `DELETE /api/invoices/:id` - Delete invoice

## 📤 CSV Upload

### Supported Column Names (Messy Data Handling)

The system intelligently detects columns with various naming conventions:

**Invoice Number**: `Invoice`, `invoice`, `Invoice Number`, `Invoice #`, `InvoiceNumber`
**Client Name**: `Client`, `client`, `Client Name`, `ClientName`, `customer`, `Customer`
**Email**: `Email`, `email`, `Client Email`, `ClientEmail`, `Email Address`
**Amount**: `Amount`, `amount`, `Total`, `total`, `Price`, `price` (removes ₹, $, commas)
**Due Date**: `Due`, `due`, `Due Date`, `DueDate`, `due_date`

### Example CSV

```csv
Invoice,Client,Email,Amount,Due
123,ABC Ltd,billing@abc.com,88500,2026-01-15
124,XYZ Corp,finance@xyz.com,75000,2026-01-18
```

## 🤖 AI Email Generation

Uses OpenAI GPT-4 to generate personalized emails:

**Day 1** - Friendly reminder (polite, assumes they may have paid)
**Day 7** - Follow-up (firm but polite, asks for update)
**Day 14** - Final notice (professional but firm, mentions consequences)

## 📧 Automatic Email Sending

**Cron Job Schedule**: Daily at 9 AM (configurable)

**Logic**:
1. Checks all unpaid invoices
2. Calculates days late
3. Sends appropriate email:
   - Day 1 late → Send Day 1 email
   - Day 7 late → Send Day 7 email
   - Day 14 late → Send Day 14 email
4. Updates invoice status
5. Logs all emails

## 🧪 Testing

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Upload CSV
```bash
curl -X POST http://localhost:3000/api/invoices/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@sample-invoices.csv"
```

## 🚀 Deployment

### Railway/Render
1. Push code to GitHub
2. Connect repository to Railway/Render
3. Add environment variables
4. Deploy!

### Environment
- Set `NODE_ENV=production`
- Use production database
- Use secure JWT_SECRET
- Configure email provider

## 📝 Notes

- **Email Provider**: Currently configured for Gmail. For production, use SendGrid/Resend
- **File Storage**: CSV files are temporarily stored in `uploads/` and deleted after processing
- **Rate Limiting**: Add rate limiting middleware for production
- **Monitoring**: Add logging service (Winston, Sentry)

## 🎯 Production Checklist

- [x] Authentication with JWT
- [x] CSV upload with messy data handling
- [x] AI email generation (OpenAI)
- [x] Automatic email sending
- [x] Cron job for daily chasing
- [x] Database schema with indexes
- [x] Error handling and logging
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] API documentation (Swagger)
- [ ] Unit tests
- [ ] Integration tests

---

**Built for agencies who deserve to get paid on time.** 🚀
