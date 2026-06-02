-- localpaste initial schema bootstrap
-- This script seeds the database with required extensions and a demo user.
-- The application also runs SQLAlchemy DDL to ensure all tables exist on boot.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables are created from SQLAlchemy metadata on application start; this file
-- only ensures the database itself is ready. See backend/app/db/base.py.
