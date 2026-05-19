const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. SIGNUP ROUTE ---
app.post('/api/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = password; // In a production app, use bcrypt to hash the password!

        const { data, error } = await supabase
            .from('users')
            .insert([
                { 
                    name, 
                    email, 
                    password_hash: hashedPassword, 
                    role 
                }
            ])
            .select();

        if (error) throw error;
        
        // Auto-create a welcome notification for new users
        await supabase
            .from('notifications')
            .insert([
                {
                    user_id: data[0].id,
                    message: `Welcome to Noorie Clinic, ${name}! Your account has been registered successfully.`
                }
            ]);

        res.status(201).json({ message: 'User registered successfully', user: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error) throw error;
        
        const user = users?.[0];

        if (!user || user.password_hash !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update the last_login_date field
        const { error: updateError } = await supabase
            .from('users')
            .update({ last_login_date: new Date().toISOString() })
            .eq('id', user.id);

        if (updateError) throw updateError;

        res.status(200).json({ message: 'Login successful', user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 3. FETCH PROFILE ROUTE ---
app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, email, role, mobile, gender, aadhaar, blood_group, country, state, district, pincode')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. UPDATE PROFILE ROUTE ---
app.put('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    const { name, mobile, email, gender, aadhaar, blood_group, country, state, district, pincode } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                name,
                mobile,
                email,
                gender,
                aadhaar,
                blood_group,
                country,
                state,
                district,
                pincode
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.status(200).json({ message: 'Profile updated successfully', user: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. CHANGE PASSWORD ROUTE ---
app.put('/api/user/:id/password', async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    try {
        // Fetch current password hash
        const { data: user, error: fetchErr } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', id)
            .single();

        if (fetchErr) throw fetchErr;

        if (user.password_hash !== currentPassword) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Update password
        const { error: updateErr } = await supabase
            .from('users')
            .update({ password_hash: newPassword })
            .eq('id', id);

        if (updateErr) throw updateErr;

        // Log notification
        await supabase
            .from('notifications')
            .insert([
                {
                    user_id: id,
                    message: 'Your security password was changed successfully.'
                }
            ]);

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 6. BOOK APPOINTMENT ROUTE ---
app.post('/api/appointments', async (req, res) => {
    const { userId, patientName, appointmentDate, appointmentTime, doctorType, doctorName } = req.body;

    if (!userId || !patientName || !appointmentDate || !appointmentTime || !doctorType || !doctorName) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const { data, error } = await supabase
            .from('appointments')
            .insert([
                {
                    user_id: userId,
                    patient_name: patientName,
                    appointment_date: appointmentDate,
                    appointment_time: appointmentTime,
                    doctor_type: doctorType,
                    doctor_name: doctorName,
                    status: 'Pending'
                }
            ])
            .select();

        if (error) throw error;

        // Add a notification for booking confirmation
        await supabase
            .from('notifications')
            .insert([
                {
                    user_id: userId,
                    message: `Appointment for ${patientName} with ${doctorName} booked successfully on ${appointmentDate} at ${appointmentTime}. Status: Pending.`
                }
            ]);

        res.status(201).json({ message: 'Appointment booked successfully', appointment: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7. FETCH APPOINTMENTS ROUTE ---
app.get('/api/user/:id/appointments', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('user_id', id)
            .order('appointment_date', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 8. FETCH NOTIFICATIONS ROUTE ---
app.get('/api/user/:id/notifications', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 9. FETCH STATS ROUTE (Count success, pending, rejected appointments) ---
app.get('/api/user/:id/stats', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('status')
            .eq('user_id', id);

        if (error) throw error;

        let success = 0;
        let pending = 0;
        let reject = 0;

        appointments.forEach(app => {
            const status = app.status.toLowerCase();
            if (status === 'accepted' || status === 'accept') success++;
            else if (status === 'pending') pending++;
            else if (status === 'rejected' || status === 'reject') reject++;
        });

        res.status(200).json({ success, pending, reject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
