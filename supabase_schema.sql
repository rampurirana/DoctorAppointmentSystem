-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the users table with full profile details
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_date TIMESTAMP WITH TIME ZONE,
    
    -- Additional profile fields for User Dashboard
    mobile VARCHAR(20),
    gender VARCHAR(20),
    aadhaar VARCHAR(20),
    blood_group VARCHAR(20),
    country VARCHAR(100) DEFAULT 'INDIA',
    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(20)
);

-- Create the appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    patient_name VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(50) NOT NULL,
    doctor_type VARCHAR(100) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Accepted', 'Rejected', 'Pending'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- These columns were in the schema but the table was created before they were added

ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'INDIA';
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Disable Row Level Security (RLS) to allow backend API access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
