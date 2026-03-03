# Maprika - Multi-Sector Data Aggregation Platform

Maprika is a production-ready MVP for a multi-sector data aggregation and visualization platform. It collects NGO, Ministry, and other organization interventions across sectors and provides aggregated insights without identifying individual organizations.

## Features

### Role-Based Access Control
- **Admin**: Full access to all features
- **Ministry**: Read dashboard analytics and submit interventions
- **NGO**: Submit interventions only

### Core Functionality
- 📊 **Dashboard**: KPI cards, charts, and district heatmaps
- 🗺️ **Mapping**: Visualize interventions geographically
- 📝 **Submit Interventions**: Form for organizations to submit their projects
- 📤 **Export Data**: Download dashboard data as CSV
- 🔐 **Authentication**: Secure JWT-based login and registration

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing
- Zod for input validation

### Frontend
- React.js + TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Query for data fetching
- Chart.js for data visualization
- React Router for navigation

## Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Update the `.env` file with your database credentials:
```env
PORT=5000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=maprika
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret_key_here
```

5. Create the PostgreSQL database:
```sql
CREATE DATABASE maprika;
```

6. Start the backend server:
```bash
npm run dev
```

7. Seed the database with sample data:
- Login with admin credentials: `admin@maprika.com` / `admin123`
- Make a POST request to `http://localhost:5000/api/seed` (admin only)

### Frontend Setup

1. Navigate to the root directory:
```bash
cd ..
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Sample Credentials

- **Admin**: admin@maprika.com / admin123
- **Ministry**: ministry@maprika.com / ministry123
- **NGO**: ngo@maprika.com / ngo123

## Database Schema

### Organizations
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(255) NOT NULL)
- type (VARCHAR(50) NOT NULL)
- contact_email (VARCHAR(255) NOT NULL)
- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Sectors
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(100) NOT NULL UNIQUE)

### Users
- id (SERIAL PRIMARY KEY)
- name (VARCHAR(255) NOT NULL)
- email (VARCHAR(255) NOT NULL UNIQUE)
- password_hash (VARCHAR(255) NOT NULL)
- role (VARCHAR(50) NOT NULL)
- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Interventions
- id (SERIAL PRIMARY KEY)
- organization_id (INTEGER REFERENCES organizations(id))
- sector_id (INTEGER REFERENCES sectors(id))
- name (VARCHAR(255) NOT NULL)
- description (TEXT NOT NULL)
- start_date (DATE NOT NULL)
- end_date (DATE NOT NULL)
- location_district (VARCHAR(255) NOT NULL)
- beneficiaries_number (INTEGER NOT NULL)
- created_at (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Organizations
- `GET /api/organizations` - Get all organizations

### Sectors
- `GET /api/sectors` - Get all sectors

### Interventions
- `GET /api/interventions` - Get all interventions
- `POST /api/interventions` - Create new intervention

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics (admin/ministry only)

### Seed Data
- `POST /api/seed` - Seed database with sample data (admin only)

## Deployment

### Backend Deployment
1. Set up a PostgreSQL database (e.g., AWS RDS, Heroku Postgres)
2. Update environment variables in production
3. Deploy to a platform like Heroku, AWS EC2, or DigitalOcean

### Frontend Deployment
1. Build the production bundle:
```bash
npm run build
```
2. Deploy the `dist` directory to a platform like Netlify, Vercel, or AWS S3

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Input validation with Zod
- CORS configuration
- Role-based access control
- Secure error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

## Support

For support, please open an issue in the GitHub repository or contact the development team.
