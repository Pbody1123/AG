const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Validation schemas
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'ministry', 'ngo']),
});

const interventionSchema = z.object({
  organization_id: z.number(),
  sector_id: z.number(),
  name: z.string().min(2),
  description: z.string().min(10),
  start_date: z.string().date(),
  end_date: z.string().date(),
  location_district: z.string().min(2),
  beneficiaries_number: z.number().min(1),
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { name, email, password, role } = validatedData;

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, passwordHash, role]
    );

    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: newUser.rows[0].id, name: newUser.rows[0].name, email: newUser.rows[0].email, role: newUser.rows[0].role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.rows[0].id, name: user.rows[0].name, email: user.rows[0].email, role: user.rows[0].role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Organizations routes
app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const organizations = await pool.query('SELECT * FROM organizations');
    res.json(organizations.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Sectors routes
app.get('/api/sectors', authenticateToken, async (req, res) => {
  try {
    const sectors = await pool.query('SELECT * FROM sectors');
    res.json(sectors.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Interventions routes
app.get('/api/interventions', authenticateToken, async (req, res) => {
  try {
    const { sector, district, start, end } = req.query;
    let query = `
      SELECT i.*, o.name as organization_name, s.name as sector_name
      FROM interventions i
      JOIN organizations o ON i.organization_id = o.id
      JOIN sectors s ON i.sector_id = s.id
    `;
    const params = [];
    let count = 1;

    if (sector) {
      query += ` WHERE s.name = $${count}`;
      params.push(sector);
      count++;
    }
    if (district) {
      query += sector ? ` AND i.location_district = $${count}` : ` WHERE i.location_district = $${count}`;
      params.push(district);
      count++;
    }
    if (start) {
      query += (sector || district) ? ` AND i.start_date >= $${count}` : ` WHERE i.start_date >= $${count}`;
      params.push(start);
      count++;
    }
    if (end) {
      query += (sector || district || start) ? ` AND i.end_date <= $${count}` : ` WHERE i.end_date <= $${count}`;
      params.push(end);
      count++;
    }

    const interventions = await pool.query(query, params);
    res.json(interventions.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/interventions', authenticateToken, requireRole(['ministry', 'ngo', 'admin']), async (req, res) => {
  try {
    const validatedData = interventionSchema.parse(req.body);
    const { organization_id, sector_id, name, description, start_date, end_date, location_district, beneficiaries_number } = validatedData;

    const newIntervention = await pool.query(
      'INSERT INTO interventions (organization_id, sector_id, name, description, start_date, end_date, location_district, beneficiaries_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [organization_id, sector_id, name, description, start_date, end_date, location_district, beneficiaries_number]
    );

    res.status(201).json(newIntervention.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, requireRole(['ministry', 'admin']), async (req, res) => {
  try {
    const totalInterventions = await pool.query('SELECT COUNT(*) FROM interventions');
    const totalBeneficiaries = await pool.query('SELECT SUM(beneficiaries_number) FROM interventions');
    const interventionsPerSector = await pool.query(`
      SELECT s.name, COUNT(i.id) as count
      FROM sectors s
      LEFT JOIN interventions i ON s.id = i.sector_id
      GROUP BY s.name
    `);
    const beneficiariesPerSector = await pool.query(`
      SELECT s.name, SUM(i.beneficiaries_number) as total
      FROM sectors s
      LEFT JOIN interventions i ON s.id = i.sector_id
      GROUP BY s.name
    `);
    const interventionsPerDistrict = await pool.query(`
      SELECT location_district, COUNT(id) as count
      FROM interventions
      GROUP BY location_district
    `);

    res.json({
      totalInterventions: parseInt(totalInterventions.rows[0].count),
      totalBeneficiaries: parseInt(totalBeneficiaries.rows[0].sum) || 0,
      interventionsPerSector: interventionsPerSector.rows,
      beneficiariesPerSector: beneficiariesPerSector.rows,
      interventionsPerDistrict: interventionsPerDistrict.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Seed data endpoint (admin only)
app.post('/api/seed', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        contact_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS interventions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        sector_id INTEGER REFERENCES sectors(id),
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        location_district VARCHAR(255) NOT NULL,
        beneficiaries_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed sectors
    const sectors = [
      { name: 'Education' },
      { name: 'Agriculture' },
      { name: 'Youth Employment' },
    ];
    for (const sector of sectors) {
      await pool.query('INSERT INTO sectors (name) VALUES ($1) ON CONFLICT DO NOTHING', [sector.name]);
    }

    // Seed organizations
    const organizations = [
      { name: 'Ministry of Education', type: 'Ministry', contact_email: 'education@gov.co' },
      { name: 'Green Agriculture NGO', type: 'NGO', contact_email: 'greenagri@ngo.org' },
      { name: 'Youth Empowerment Initiative', type: 'NGO', contact_email: 'youth@ngo.org' },
      { name: 'Community Development Foundation', type: 'NGO', contact_email: 'community@ngo.org' },
      { name: 'Rural Development Agency', type: 'Other', contact_email: 'rural@agency.co' },
    ];
    for (const org of organizations) {
      await pool.query(
        'INSERT INTO organizations (name, type, contact_email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [org.name, org.type, org.contact_email]
      );
    }

    // Seed users
    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const ministryPassword = await bcrypt.hash('ministry123', saltRounds);
    const ngoPassword = await bcrypt.hash('ngo123', saltRounds);

    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      ['Admin User', 'admin@maprika.com', adminPassword, 'admin']
    );
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      ['Ministry User', 'ministry@maprika.com', ministryPassword, 'ministry']
    );
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      ['NGO User', 'ngo@maprika.com', ngoPassword, 'ngo']
    );

    // Seed interventions
    const interventions = [
      { organization_id: 1, sector_id: 1, name: 'Primary School Construction', description: 'Building 5 new primary schools in rural areas', start_date: '2023-01-01', end_date: '2023-12-31', location_district: 'Kigali', beneficiaries_number: 1500 },
      { organization_id: 2, sector_id: 2, name: 'Sustainable Farming Training', description: 'Training 200 farmers on organic farming techniques', start_date: '2023-02-01', end_date: '2023-10-31', location_district: 'Butare', beneficiaries_number: 200 },
      { organization_id: 3, sector_id: 3, name: 'Youth Entrepreneurship Program', description: 'Providing startup grants and training to 100 young entrepreneurs', start_date: '2023-03-01', end_date: '2024-03-01', location_district: 'Gisenyi', beneficiaries_number: 100 },
      { organization_id: 4, sector_id: 1, name: 'Adult Literacy Campaign', description: 'Teaching basic literacy to 500 adults in rural communities', start_date: '2023-04-01', end_date: '2023-12-31', location_district: 'Kibuye', beneficiaries_number: 500 },
      { organization_id: 5, sector_id: 2, name: 'Irrigation System Installation', description: 'Installing irrigation systems for 100 smallholder farmers', start_date: '2023-05-01', end_date: '2023-09-30', location_district: 'Ruhengeri', beneficiaries_number: 100 },
      { organization_id: 2, sector_id: 2, name: 'Livestock Vaccination Campaign', description: 'Vaccinating 5000 cattle against common diseases', start_date: '2023-06-01', end_date: '2023-08-31', location_district: 'Butare', beneficiaries_number: 500 },
      { organization_id: 3, sector_id: 3, name: 'Digital Skills Training', description: 'Teaching digital skills to 200 youth for employment', start_date: '2023-07-01', end_date: '2023-12-31', location_district: 'Kigali', beneficiaries_number: 200 },
      { organization_id: 1, sector_id: 1, name: 'School Material Distribution', description: 'Distributing textbooks and supplies to 10 schools', start_date: '2023-08-01', end_date: '2023-09-30', location_district: 'Gisenyi', beneficiaries_number: 1000 },
      { organization_id: 4, sector_id: 3, name: 'Women Empowerment Program', description: 'Providing microloans and training to 150 women', start_date: '2023-09-01', end_date: '2024-09-01', location_district: 'Kibuye', beneficiaries_number: 150 },
      { organization_id: 5, sector_id: 2, name: 'Agroforestry Project', description: 'Planting 10,000 trees for soil conservation and income', start_date: '2023-10-01', end_date: '2024-10-01', location_district: 'Ruhengeri', beneficiaries_number: 300 },
    ];
    for (const intervention of interventions) {
      await pool.query(
        'INSERT INTO interventions (organization_id, sector_id, name, description, start_date, end_date, location_district, beneficiaries_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
        [intervention.organization_id, intervention.sector_id, intervention.name, intervention.description, intervention.start_date, intervention.end_date, intervention.location_district, intervention.beneficiaries_number]
      );
    }

    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
