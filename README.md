# Order System - Frontend

A modern, beautiful frontend for the Order Management System with glassmorphic UI design inspired by iOS.

## 🎨 Features

- **Modern Glassmorphic Design** - Beautiful glass-effect UI with backdrop blur
- **iOS-Inspired Aesthetics** - Smooth animations and clean interface
- **Responsive Layout** - Works seamlessly on all screen sizes
- **TypeScript** - Full type safety
- **React 19** - Latest React features

## 🚀 Tech Stack

- **React 19** with TypeScript
- **Vite** - Lightning fast build tool
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

## 📦 Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node 20+)
- npm or yarn

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🔗 API Configuration

The frontend connects to the backend API at `http://localhost:8080/api` by default.

To change this, update the `API_BASE_URL` in `src/services/api.ts`.

## 🎯 Features

### ✅ Authentication
- **User Login Page** - Beautiful glassmorphic design with animated background
- **Admin Login Page** - Separate admin authentication
- JWT token-based authentication
- Secure password handling
- Auto-logout on token expiration

### ✅ Admin Dashboard
- **User Management**
  - View all users in a clean table format
  - Create new users with full form validation
  - Edit user details (name, phone, DOB, address)
  - Reset user passwords with custom password input
  - Delete users with confirmation modal
  - Phone number formatting (XXX-XXXXXXX)
  - User ID display

### ✅ User Dashboard

#### Profile Management
- View personal details (name, email, phone, DOB, address, etc.)
- Edit personal information
- Change password securely
- Responsive, compact form design

#### Products Management
- Grid display of products (2-5 columns responsive)
- Create products with:
  - Name, category, original price, special price, image URL
  - Category dropdown selection
  - Price validation (special price ≤ original price)
- Edit products with pre-populated form
- Delete products with confirmation
- Category badges and "SALE" indicators
- Image error handling

#### Categories Management
- List view of all categories
- Create new categories
- Edit category names
- Simple, clean interface

#### Customers Management
- List view with name, phone, and email displayed horizontally
- Create new customers with validation
- Edit customer information
- Email format validation
- Phone number validation (digits only)
- Formatted phone display

#### Locations Management
- Card-based display of locations
- Create new locations (name, address, phone)
- Edit existing locations
- Delete locations with confirmation
- Responsive card grid (1-4 columns)
- Mobile-optimized layout

### 🚧 Coming Soon
- Orders Management
- Advanced filtering and search
- Bulk operations
- Analytics dashboard

## 🎨 Design System

### Glass Components

- `.glass-card` - Card with glass effect
- `.glass-button` - Interactive button with glass effect
- `.glass-input` - Input field with glass effect

### Animations

- Smooth transitions
- Animated background blobs
- Interactive hover states
- Active states with scale effects

## 📁 Project Structure

```
ordersystem-FE/
├── src/
│   ├── components/          # Reusable components
│   │   ├── AddLocationModal.tsx
│   │   ├── EditLocationModal.tsx
│   │   ├── AddUserModal.tsx
│   │   ├── EditProfileModal.tsx
│   │   ├── ChangePasswordModal.tsx
│   │   └── UserLayout.tsx   # Main user dashboard layout
│   ├── pages/               # Page components
│   │   ├── LoginPage.tsx           # User login
│   │   ├── AdminLoginPage.tsx      # Admin login
│   │   ├── AdminDashboard.tsx      # Admin user management
│   │   ├── ProfilePage.tsx         # User profile
│   │   ├── ProductsPage.tsx        # Product management
│   │   ├── CategoriesPage.tsx      # Category management
│   │   ├── CustomersPage.tsx       # Customer management
│   │   ├── LocationsPage.tsx       # Location management
│   │   └── OrdersPage.tsx          # Orders (coming soon)
│   ├── services/            # API services
│   │   └── api.ts           # API client & all API methods
│   ├── App.tsx              # Main app & routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles & design system
├── public/                  # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🔐 Authentication

The app uses JWT token-based authentication:

1. User logs in with email and password
2. Backend returns JWT token
3. Token is stored in localStorage
4. Token is automatically attached to all API requests

## 🤝 Contributing

This is part of the Order Management System. Please ensure your code follows the existing patterns and design system.

## 📄 License

Private - All rights reserved
