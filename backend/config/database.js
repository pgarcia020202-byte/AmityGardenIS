import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Force IPv4 DNS lookups
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  family: 4, // Force IPv4 instead of IPv6
});

// Test connection - only log once on successful connection
let connectionLogged = false;
pool.on('connect', () => {
  if (!connectionLogged) {
    console.log('Connected to Supabase PostgreSQL database');
    connectionLogged = true;
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
