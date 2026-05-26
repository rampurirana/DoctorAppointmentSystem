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
    name_updated BOOLEAN DEFAULT FALSE NOT NULL,
    email_updated BOOLEAN DEFAULT FALSE NOT NULL,
    
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

-- Store doctor authentication and profile details separately from patient/admin accounts.
CREATE TABLE IF NOT EXISTS doctors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL, -- legacy link only
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Doctor',
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_date TIMESTAMP WITH TIME ZONE,
    name_updated BOOLEAN DEFAULT FALSE NOT NULL,
    email_updated BOOLEAN DEFAULT FALSE NOT NULL,
    mobile VARCHAR(20),
    gender VARCHAR(20),
    aadhaar VARCHAR(20),
    blood_group VARCHAR(20),
    country VARCHAR(100) DEFAULT 'INDIA',
    state VARCHAR(100),
    district VARCHAR(100),
    pincode VARCHAR(20),
    specialty VARCHAR(100) NOT NULL DEFAULT 'General Physician',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade databases that used doctors only as a profile table.
ALTER TABLE doctors ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'Doctor';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS name_updated BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email_updated BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS mobile VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS aadhaar VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'INDIA';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

-- Copy any legacy doctor login records into doctors. Existing user rows are retained
-- because older notification/history references may still point at them.
INSERT INTO doctors (
    user_id, name, email, password_hash, role, registration_date, last_login_date,
    name_updated, email_updated, mobile, gender, aadhaar, blood_group, country,
    state, district, pincode, specialty
)
SELECT
    id, name, email, password_hash, 'Doctor', registration_date, last_login_date,
    name_updated, email_updated, mobile, gender, aadhaar, blood_group, country,
    state, district, pincode, 'General Physician'
FROM users
WHERE LOWER(role) = 'doctor'
ON CONFLICT (user_id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    last_login_date = EXCLUDED.last_login_date,
    mobile = EXCLUDED.mobile,
    gender = EXCLUDED.gender,
    aadhaar = EXCLUDED.aadhaar,
    blood_group = EXCLUDED.blood_group,
    country = EXCLUDED.country,
    state = EXCLUDED.state,
    district = EXCLUDED.district,
    pincode = EXCLUDED.pincode;

-- Create the appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    appointment_id VARCHAR(50),
    appointment_date DATE NOT NULL,
    booking_slot VARCHAR(50), -- Doctor-assigned serial number, e.g. '01', set when accepted
    doctor_type VARCHAR(100) NOT NULL, -- Snapshot preserved for appointment history
    doctor_name VARCHAR(255) NOT NULL, -- Snapshot preserved for appointment history
    status VARCHAR(50) DEFAULT 'Pending', -- 'Accepted', 'Rejected', 'Pending', 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure appointment_id column exists for existing installations
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_id VARCHAR(50);

-- Upgrade existing appointments and connect records where the doctor account already exists.
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
UPDATE appointments AS appointment
SET doctor_id = doctor.id
FROM doctors AS doctor
WHERE appointment.doctor_id IS NULL
  AND LOWER(TRIM(appointment.doctor_name)) = LOWER(TRIM(doctor.name))
  AND LOWER(TRIM(appointment.doctor_type)) = LOWER(TRIM(doctor.specialty));

-- Rename the original slot column when upgrading an already-created database
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'appointments'
          AND column_name = 'appointment_time'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'appointments'
          AND column_name = 'booking_slot'
    ) THEN
        ALTER TABLE appointments RENAME COLUMN appointment_time TO booking_slot;
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'appointments'
          AND column_name = 'appointment_time'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'appointments'
          AND column_name = 'booking_slot'
    ) THEN
        UPDATE appointments
        SET booking_slot = appointment_time
        WHERE booking_slot IS NULL;
        ALTER TABLE appointments ALTER COLUMN appointment_time DROP NOT NULL;
    END IF;
END $$;

-- Pending appointments wait for the doctor to assign a serial number on acceptance.
ALTER TABLE appointments ALTER COLUMN booking_slot DROP NOT NULL;
UPDATE appointments
SET booking_slot = NULL
WHERE LOWER(status) IN ('pending', 'rejected', 'cancelled');

-- Old accepted appointments may contain time values; they require a new doctor serial.
UPDATE appointments
SET booking_slot = NULL,
    status = 'Pending'
WHERE LOWER(status) = 'accepted'
  AND booking_slot IS NOT NULL
  AND booking_slot !~ '^[0-9]{1,3}$';

-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
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
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_updated BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_updated BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE;

-- Disable Row Level Security (RLS) to allow backend API access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_name ON appointments(doctor_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_doctor_date_serial
ON appointments(doctor_name, appointment_date, booking_slot)
WHERE status IN ('Accepted', 'Completed') AND booking_slot IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_doctor_id_date_serial
ON appointments(doctor_id, appointment_date, booking_slot)
WHERE status IN ('Accepted', 'Completed') AND booking_slot IS NOT NULL AND doctor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_doctor_id ON notifications(doctor_id);
