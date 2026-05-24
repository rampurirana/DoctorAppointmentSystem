const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
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
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

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
            .select('id, name, email, role');

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

        // Compare hashed password
        const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update the last_login_date field
        await supabase
            .from('users')
            .update({ last_login_date: new Date().toISOString() })
            .eq('id', user.id);

        const { password_hash, ...safeUser } = user;
        res.status(200).json({ message: 'Login successful', user: safeUser });
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
            .select('id, name, email, role, mobile, gender, aadhaar, blood_group, country, state, district, pincode, name_updated, email_updated')
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
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('name, email, name_updated, email_updated')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const trimmedName = String(name || '').trim();
        const trimmedEmail = String(email || '').trim();
        if (!trimmedName || !trimmedEmail) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const nameChanged = trimmedName !== existingUser.name;
        const emailChanged = trimmedEmail !== existingUser.email;
        if (existingUser.name_updated && nameChanged) {
            return res.status(409).json({ error: 'Name can only be updated once' });
        }
        if (existingUser.email_updated && emailChanged) {
            return res.status(409).json({ error: 'Email can only be updated once' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({
                name: trimmedName,
                mobile,
                email: trimmedEmail,
                gender,
                aadhaar,
                blood_group,
                country,
                state,
                district,
                pincode,
                name_updated: existingUser.name_updated || nameChanged,
                email_updated: existingUser.email_updated || emailChanged
            })
            .eq('id', id)
            .select('id, name, email, role, mobile, gender, aadhaar, blood_group, country, state, district, pincode, name_updated, email_updated');

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

        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateErr } = await supabase
            .from('users')
            .update({ password_hash: newHashedPassword })
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
    const {
        userId,
        patientName,
        appointmentDate,
        doctorType,
        doctorName
    } = req.body || {};

    if (!userId || !patientName || !appointmentDate || !doctorType || !doctorName) {
        const missingFields = [];
        if (!userId) missingFields.push('userId');
        if (!patientName) missingFields.push('patientName');
        if (!appointmentDate) missingFields.push('appointmentDate');
        if (!doctorType) missingFields.push('doctorType');
        if (!doctorName) missingFields.push('doctorName');
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    try {
        const { data, error } = await supabase
            .from('appointments')
            .insert([
                {
                    user_id: userId,
                    patient_name: patientName,
                    appointment_date: appointmentDate,
                    booking_slot: null,
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
                    message: `Appointment for ${patientName} with ${doctorName} was requested on ${appointmentDate}. Your serial number will be assigned after doctor approval. Status: Pending.`
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

// --- 8. FETCH DOCTOR APPOINTMENTS ROUTE ---
app.get('/api/doctor/appointments', async (req, res) => {
    const doctorName = (req.query.doctorName || '').trim();

    if (!doctorName) {
        return res.status(400).json({ error: 'doctorName is required' });
    }

    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_name', doctorName)
            .order('appointment_date', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 9. FETCH NOTIFICATIONS ROUTE ---
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

// --- 10. FETCH STATS ROUTE (Count success, pending, rejected/cancelled appointments) ---
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
            else if (status === 'rejected' || status === 'reject' || status === 'cancelled' || status === 'cancel') reject++;
        });

        res.status(200).json({ success, pending, reject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11. DOCTOR ACCEPT/REJECT ROUTES ---
app.patch('/api/appointments/:id/accept', async (req, res) => {
    const { id } = req.params;
    const doctorName = (req.body.doctorName || '').trim();
    const enteredSerial = String(req.body.bookingSlot || '').trim();

    if (!doctorName || !/^\d{1,3}$/.test(enteredSerial)) {
        return res.status(400).json({ error: 'Doctor name and a numeric serial number (for example 01) are required' });
    }

    const bookingSlot = enteredSerial.padStart(2, '0');

    try {
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (appointment.doctor_name !== doctorName) {
            return res.status(403).json({ error: 'This appointment is not assigned to this doctor' });
        }
        if ((appointment.status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ error: 'Only pending appointments can be accepted' });
        }

        const { data: slotMatches, error: slotError } = await supabase
            .from('appointments')
            .select('id')
            .eq('doctor_name', doctorName)
            .eq('appointment_date', appointment.appointment_date)
            .eq('booking_slot', bookingSlot)
            .eq('status', 'Accepted');

        if (slotError) throw slotError;
        if (slotMatches.length > 0) {
            return res.status(409).json({ error: `Serial number ${bookingSlot} is already assigned for this date` });
        }

        const { data: updatedAppointments, error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'Accepted', booking_slot: bookingSlot })
            .eq('id', id)
            .select();

        if (updateError) throw updateError;

        await supabase.from('notifications').insert([{
            user_id: appointment.user_id,
            message: `Your appointment with ${doctorName} on ${appointment.appointment_date} was accepted. Serial number: ${bookingSlot}.`
        }]);

        res.status(200).json({ message: `Appointment accepted with serial number ${bookingSlot}`, appointment: updatedAppointments[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/appointments/:id/reject', async (req, res) => {
    const { id } = req.params;
    const doctorName = (req.body.doctorName || '').trim();

    if (!doctorName) {
        return res.status(400).json({ error: 'doctorName is required' });
    }

    try {
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (appointment.doctor_name !== doctorName) {
            return res.status(403).json({ error: 'This appointment is not assigned to this doctor' });
        }
        if ((appointment.status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ error: 'Only pending appointments can be rejected' });
        }

        const { data: updatedAppointments, error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'Rejected', booking_slot: null })
            .eq('id', id)
            .select();

        if (updateError) throw updateError;

        await supabase.from('notifications').insert([{
            user_id: appointment.user_id,
            message: `Your appointment request with ${doctorName} on ${appointment.appointment_date} was rejected.`
        }]);

        res.status(200).json({ message: 'Appointment rejected', appointment: updatedAppointments[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 12. CANCEL APPOINTMENT ROUTE ---
async function cancelAppointment(req, res) {
    const { id } = req.params;

    try {
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('status, user_id, patient_name, doctor_name')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        const statusLower = (appointment.status || "").toLowerCase();
        if (statusLower === 'cancelled' || statusLower === 'cancel') {
            return res.status(200).json({ message: 'Appointment is already cancelled', appointment });
        }
        if (statusLower === 'rejected' || statusLower === 'reject') {
            return res.status(400).json({ error: 'Cannot cancel a rejected appointment' });
        }

        const { data: updatedAppointments, error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'Cancelled' })
            .eq('id', id)
            .select();

        if (updateError) throw updateError;

        // Add notification for cancellation
        await supabase
            .from('notifications')
            .insert([
                {
                    user_id: appointment.user_id,
                    message: `Appointment for ${appointment.patient_name} with ${appointment.doctor_name} has been cancelled.`
                }
            ]);

        res.status(200).json({
            message: 'Appointment cancelled successfully',
            appointment: updatedAppointments[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// PATCH describes this operation correctly: the appointment remains stored.
app.patch('/api/appointments/:id/cancel', cancelAppointment);

// Retain compatibility with clients that used the earlier cancellation URL.
app.delete('/api/appointments/:id', cancelAppointment);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
