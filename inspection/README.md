# Nairobi City County - Integrated Business Inspection System

A comprehensive web-based inspection management system for the Nairobi City County Government (NCCG). This platform streamlines the business inspection workflow, from initial inspection by Public Health Officers (PHOs) through NCCG review and finance verification.

## Overview

This system facilitates the complete inspection lifecycle for businesses within Nairobi County, including:

- **Pest Control Inspections**: PHOs conduct on-site inspections and record findings
- **NCCG Review**: Senior officers review and approve inspection reports
- **Fee Assessment**: Finance team verifies and manages inspection fees
- **Administration**: Staff management, supervision, and system oversight

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router DOM v7
- **Maps**: Leaflet + React-Leaflet
- **PDF Generation**: jsPDF
- **Icons**: Lucide React
- **Styling**: Custom CSS with CSS variables

## Project Structure

```
/home/steve/inspection
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Shared components (Modal, Table, Badge, etc.)
│   │   └── layout/          # Layout components (DashboardLayout)
│   ├── contexts/            # React contexts (AuthContext)
│   ├── hooks/               # Custom hooks (usePaginatedData)
│   ├── lib/                 # Core libraries (supabase, feeData, logger, pdfGenerator)
│   ├── pages/               # Page components by role
│   │   ├── Admin/           # Admin dashboard and management
│   │   ├── Finance/         # Finance team pages
│   │   ├── Login/           # Authentication
│   │   ├── NCCG/            # NCCG officer review pages
│   │   ├── PHO/             # Public Health Officer inspection pages
│   │   └── Superadmin/      # Super admin system settings
│   ├── styles/              # Global styles
│   ├── App.jsx              # Main app with routing
│   └── main.jsx             # Entry point
├── migrations/              # Database migrations (SQL)
├── data/                    # Reference data (fee schedules, etc.)
├── legacy/                  # Legacy/previous version files
├── public/                  # Static assets
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
└── eslint.config.js         # ESLint configuration
```

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `inspector` | Public Health Officer (PHO) | Conduct inspections, view assigned tasks |
| `nccg_officer` | NCCG Review Officer | Review inspections, approve/reject |
| `finance_manager` | Finance Team | Verify fees, process payments |
| `admin` | Department Admin | Staff management, supervision |
| `super_admin` | System Administrator | Full system access, settings |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project (local or cloud)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Environment Setup

Configure your Supabase credentials in `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup

Run the migrations in the `migrations/` directory in sequential order to set up the database schema:

1. `01_create_businesses.sql` - Businesses table
2. `02_create_inspections.sql` - Inspections table
3. `04_rbac_schema.sql` - User roles and permissions
4. And subsequent migrations...

## Features

### Public Health Officer (PHO)
- View assigned inspection tasks
- Complete inspection forms with business details
- Record pest control findings and recommendations
- Generate inspection reports (PDF)

### NCCG Officer
- Review submitted inspections
- Approve or reject inspection reports
- View inspection history and statistics

### Finance Manager
- View inspection fee assessments
- Verify and process payments
- Financial reporting and analytics

### Admin
- Staff management (add, edit, allocate)
- Supervision metrics dashboard
- Bulk allocation of inspections
- Map overview of inspection zones

### Super Admin
- System settings management
- Activity feed monitoring
- Error logs panel
- User role management

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run check:roles` | Verify role-based access configuration |
| `npm run ops:smoke` | Verify critical operational artifacts exist |

## API Integration

The application uses Supabase for:
- **Authentication**: Email/password login with role-based redirects
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Subscription to database changes

## Operations Docs

- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Performance Checks](docs/PERFORMANCE_CHECKS.md)

## License

Internal use only - Nairobi City County Government
