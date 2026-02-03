# PayMe.ai - Production-Ready Frontend

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📋 Features

### ✅ Production-Ready Architecture
- **Error Boundary**: Catches and handles React errors gracefully
- **State Management**: Context API for global state
- **API Client**: Axios with interceptors, retry logic, and error handling
- **Loading States**: Spinners, overlays, and skeleton screens
- **Toast Notifications**: User-friendly success/error messages
- **Form Validation**: CSV validation with detailed error messages
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Performance**: useMemo, useCallback for optimization

### 🎨 Design System
- **Minimal Aesthetic**: Clean, Linear/Vercel-inspired design
- **Color Palette**: Zinc scale (900, 600, 200, 50)
- **Typography**: Inter font
- **Components**: Reusable Button, Card, Input components
- **No Gradients**: Solid colors only

### 📄 Pages
1. **Landing** - Hero, stats, features, testimonial, CTA
2. **Upload** - CSV drag-drop, validation, preview table
3. **Dashboard** - Stats cards, invoice table, email preview modal

## 🛠️ Tech Stack

- **Framework**: Vite + React 18
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM
- **State**: Context API
- **HTTP**: Axios
- **CSV**: PapaParse
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Utils**: clsx, tailwind-merge

## 📁 Project Structure

```
src/
├── components/
│   ├── ErrorBoundary.jsx    # Error boundary component
│   ├── Loading.jsx           # Loading components
│   └── UI.jsx                # Reusable UI components
├── context/
│   └── AppContext.jsx        # Global state management
├── lib/
│   ├── utils.js              # Utility functions
│   └── validation.js         # Validation functions
├── pages/
│   ├── Landing.jsx           # Landing page
│   ├── Upload.jsx            # CSV upload page
│   └── Dashboard.jsx         # Dashboard page
├── services/
│   └── api.js                # API client
├── App.jsx                   # Main app component
├── main.jsx                  # Entry point
└── index.css                 # Global styles
```

## 🔧 Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=PayMe.ai
VITE_APP_ENV=development
```

## 📊 CSV Format

Upload CSV files with these columns:

```csv
Invoice,Client,Email,Amount,Due
123,ABC Ltd,billing@abc.com,88500,2026-01-15
124,XYZ Corp,finance@xyz.com,75000,2026-01-18
```

## 🧪 Testing

1. Open http://localhost:5173
2. Click "Start Free Trial"
3. Upload `sample-invoices.csv`
4. Review preview and click "Start Chasing"
5. View dashboard with stats and email previews

## 🎯 Production Checklist

### ✅ Completed
- [x] Error handling & boundaries
- [x] State management (Context API)
- [x] Loading states & toast notifications
- [x] Form validation
- [x] API client for backend
- [x] Accessibility features
- [x] Performance optimizations (useMemo, useCallback)
- [x] Environment variables
- [x] Clean code structure
- [x] Semantic HTML
- [x] ARIA labels
- [x] Keyboard navigation

### 🔄 Backend Integration Ready
- API client configured with interceptors
- Error handling for network failures
- Fallback to localStorage when backend unavailable
- Easy to switch from localStorage to API calls

### 📦 Deployment Ready
- Build optimization configured
- Environment variables setup
- Production error handling
- SEO meta tags

## 🚀 Backend Integration

When backend is ready, update `src/context/AppContext.jsx`:

```javascript
// Current: localStorage fallback
const stored = localStorage.getItem('invoices');

// Future: API call
const response = await api.invoices.getAll();
setInvoices(response.data);
```

The API client (`src/services/api.js`) is already configured with:
- Request/response interceptors
- Auth token handling
- Error handling
- Retry logic

## 📝 Notes

- **State Persistence**: Currently uses localStorage (will switch to backend)
- **Mock Data**: Email templates are hardcoded (backend will generate via OpenAI)
- **Auth**: Clerk integration pending
- **Payments**: Stripe integration pending

## 🎨 Design Philosophy

- **Minimal**: No distractions, clean borders, ample whitespace
- **Professional**: Trustworthy, agency-ready aesthetic
- **High Productivity**: Dense tables, scannable layout
- **Accessible**: WCAG compliant, keyboard navigable

## 📞 Support

For issues or questions, check the implementation plan and walkthrough in the `brain` directory.

---

**Built with ❤️ for agencies who deserve to get paid on time.**
