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
const defaultDoctorSpecialty = 'General Physician';

async function getDoctorById(doctorId) {
    const { data, error } = await supabase
        .from('doctors')
        .select('id, name, email, role, specialty, is_available')
        .eq('id', doctorId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

// --- 1. SIGNUP ROUTE ---
app.post('/api/signup', async (req, res) => {
    const { name, email, password, role, specialty } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        const isDoctor = role.toLowerCase() === 'doctor';

        const accountTable = isDoctor ? 'doctors' : 'users';
        const accountDetails = {
            name,
            email,
            password_hash: hashedPassword,
            role
        };
        if (isDoctor) {
            accountDetails.specialty = String(specialty || defaultDoctorSpecialty).trim() || defaultDoctorSpecialty;
        }

        const { data, error } = await supabase
            .from(accountTable)
            .insert([
                accountDetails
            ])
            .select('id, name, email, role');

        if (error) throw error;
        
        const registeredUser = data[0];
        if (isDoctor) {
            // Connect pending legacy name-based appointments when the doctor registers.
            await supabase
                .from('appointments')
                .update({ doctor_id: registeredUser.id })
                .is('doctor_id', null)
                .eq('doctor_name', registeredUser.name);
        } else {
            // Notifications are linked to patient/admin accounts in users.
            await supabase
                .from('notifications')
                .insert([{
                    user_id: registeredUser.id,
                    message: `Welcome to Noorie Clinic, ${name}! Your account has been registered successfully.`
                }]);
        }

        res.status(201).json({ message: 'Account registered successfully', user: registeredUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. LOGIN ROUTE ---
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const loginAsDoctor = String(role || '').toLowerCase() === 'doctor';
        const accountTable = loginAsDoctor ? 'doctors' : 'users';
        const { data: accounts, error } = await supabase
            .from(accountTable)
            .select('*')
            .eq('email', email);

        if (error) throw error;
        
        const user = accounts?.[0];

        // Compare hashed password
        const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update the last_login_date field
        await supabase
            .from(accountTable)
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

// --- 5a. FETCH DOCTOR PROFILE ROUTE ---
app.get('/api/doctor/profile/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: doctor, error } = await supabase
            .from('doctors')
            .select('id, name, email, role, specialty, is_available, mobile, gender, aadhaar, blood_group, country, state, district, pincode, name_updated, email_updated')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.status(200).json(doctor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5b. UPDATE DOCTOR PROFILE ROUTE ---
app.put('/api/doctor/profile/:id', async (req, res) => {
    const { id } = req.params;
    const { name, mobile, email, gender, aadhaar, blood_group, country, state, district, pincode, specialty, is_available } = req.body;

    try {
        const { data: existingDoctor, error: fetchError } = await supabase
            .from('doctors')
            .select('name, email, name_updated, email_updated')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const trimmedName = String(name || '').trim();
        const trimmedEmail = String(email || '').trim();
        if (!trimmedName || !trimmedEmail) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const nameChanged = trimmedName !== existingDoctor.name;
        const emailChanged = trimmedEmail !== existingDoctor.email;
        if (existingDoctor.name_updated && nameChanged) {
            return res.status(409).json({ error: 'Name can only be updated once' });
        }
        if (existingDoctor.email_updated && emailChanged) {
            return res.status(409).json({ error: 'Email can only be updated once' });
        }

        const { data, error } = await supabase
            .from('doctors')
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
                specialty,
                is_available,
                name_updated: existingDoctor.name_updated || nameChanged,
                email_updated: existingDoctor.email_updated || emailChanged
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.status(200).json({ message: 'Doctor profile updated successfully', user: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5c. CHANGE DOCTOR PASSWORD ROUTE ---
app.put('/api/doctor/:id/password', async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    try {
        const { data: doctor, error: fetchErr } = await supabase.from('doctors').select('password_hash').eq('id', id).single();
        if (fetchErr) throw fetchErr;
        if (!(await bcrypt.compare(currentPassword, doctor.password_hash))) return res.status(400).json({ error: 'Incorrect current password' });
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await supabase.from('doctors').update({ password_hash: newHashedPassword }).eq('id', id);

        // Log notification for the doctor regarding security change
        await supabase
            .from('notifications')
            .insert([
                {
                    doctor_id: id,
                    message: 'Your professional account password was changed successfully.'
                }
            ]);

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 6. LIST AVAILABLE DOCTORS ROUTE ---
app.get('/api/doctors', async (req, res) => {
    const specialty = String(req.query.specialty || '').trim();

    try {
        let query = supabase
            .from('doctors')
            .select('id, name, specialty, is_available')
            .order('specialty', { ascending: true })
            .order('name', { ascending: true });

        if (specialty) {
            query = query.eq('specialty', specialty);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 7. BOOK APPOINTMENT ROUTE ---
app.post('/api/appointments', async (req, res) => {
    const {
        userId,
        patientName,
        appointmentDate,
        doctorId
    } = req.body || {};

    if (!userId || !patientName || !appointmentDate || !doctorId) {
        if (userId === 'mock_user') {
            return res.status(400).json({ error: 'Cannot book appointments in Mock Mode. Please log in with a real patient account.' });
        }

        const missingFields = [];
        if (!userId) missingFields.push('userId');
        if (!patientName) missingFields.push('patientName');
        if (!appointmentDate) missingFields.push('appointmentDate');
        if (!doctorId) missingFields.push('doctorId');
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    try {
        // Verify the user exists in the 'users' table to satisfy the foreign key constraint.
        // This prevents the constraint error if a Doctor or Admin tries to book.
        const { data: userRecord, error: userFetchError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

        if (userFetchError) throw userFetchError;
        
        if (!userRecord) {
            return res.status(403).json({ error: 'Unauthorized: Only registered Patients can book appointments. Doctors/Admins must use a separate Patient account to book.' });
        }

        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, name, specialty')
            .eq('id', doctorId)
            .eq('is_available', true) // Server-side validation for availability
            .maybeSingle();

        if (doctorError) throw doctorError;
        if (!doctor) {
            return res.status(400).json({ error: 'Selected doctor is not available' });
        }

        // Generate custom Appointment ID: APTYYYYMMDDSerialNo
        // Using split to avoid timezone issues with new Date()
        const dateString = appointmentDate.replace(/-/g, '');

        const { count, error: countError } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('appointment_date', appointmentDate);
        
        if (countError) throw countError;
        
        const serialNo = String((count || 0) + 1).padStart(3, '0');
        const customApptId = `APT${dateString}${serialNo}`;

        const { data, error } = await supabase
            .from('appointments')
            .insert([
                {
                    user_id: userId,
                    doctor_id: doctor.id,
                    patient_name: patientName,
                    appointment_id: customApptId,
                    appointment_date: appointmentDate,
                    booking_slot: null,
                    doctor_type: doctor.specialty,
                    doctor_name: doctor.name,
                    status: 'Pending'
                }
            ])
            .select();

        if (error) throw error;

        // Add a notification for booking confirmation
        await supabase.from('notifications').insert([
            {
                user_id: userId,
                message: `Appointment for ${patientName} with ${doctor.name} was requested on ${appointmentDate}. Your Appointment ID is ${customApptId}. Serial number will be assigned after doctor approval.`
            },
            {
                doctor_id: doctorId,
                message: `New appointment request received from ${patientName} for ${appointmentDate}.`
            }
        ]);

        res.status(201).json({ message: 'Appointment booked successfully', appointment: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 8. FETCH APPOINTMENTS ROUTE ---
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

// --- 9. FETCH DOCTOR APPOINTMENTS ROUTE ---
app.get('/api/doctor/appointments', async (req, res) => {
    const doctorId = String(req.query.doctorId || '').trim();

    if (!doctorId) {
        return res.status(400).json({ error: 'doctorId is required' });
    }

    try {
        const doctor = await getDoctorById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', doctor.id)
            .order('appointment_date', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 10. FETCH NOTIFICATIONS ROUTE ---
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

// --- 10a. FETCH USER UNREAD NOTIFICATION COUNT ---
app.get('/api/user/:id/notifications/unread-count', async (req, res) => {
    const { id } = req.params;
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', id)
            .eq('is_read', false);

        if (error) throw error;
        res.status(200).json({ unreadCount: count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 10b. MARK USER NOTIFICATIONS AS READ ---
app.patch('/api/user/:id/notifications/read', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', id)
            .eq('is_read', false);

        if (error) throw error;
        res.status(200).json({ message: 'Notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11. FETCH STATS ROUTE (Count success, pending, rejected/cancelled appointments) ---
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

// --- 11a. FETCH DOCTOR STATS ROUTE ---
app.get('/api/doctor/:id/stats', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('status')
            .eq('doctor_id', id);

        if (error) throw error;

        let accepted = 0;
        let pending = 0;
        let rejected = 0;

        appointments.forEach(app => {
            const status = (app.status || '').toLowerCase().trim();
            if (status === 'completed') accepted++;
            else if (status === 'pending' || status === 'accepted' || status === 'accept') pending++;
            else if (status === 'rejected' || status === 'reject' || status === 'cancelled' || status === 'cancel' || status === 'not completed') rejected++;
        });

        res.status(200).json({ accepted, pending, rejected });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 12. DOCTOR ACCEPT/REJECT ROUTES ---
app.patch('/api/appointments/:id/accept', async (req, res) => {
    const { id } = req.params;
    const doctorId = String(req.body.doctorId || '').trim();
    const enteredSerial = String(req.body.bookingSlot || '').trim();

    if (!doctorId || !/^\d{1,3}$/.test(enteredSerial)) {
        return res.status(400).json({ error: 'Doctor account and a numeric serial number (for example 01) are required' });
    }

    const bookingSlot = enteredSerial.padStart(2, '0');

    try {
        const doctor = await getDoctorById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (appointment.doctor_id !== doctor.id) {
            return res.status(403).json({ error: 'This appointment is not assigned to this doctor' });
        }
        if ((appointment.status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ error: 'Only pending appointments can be accepted' });
        }

        const { data: slotMatches, error: slotError } = await supabase
            .from('appointments')
            .select('id')
            .eq('doctor_id', doctor.id)
            .eq('appointment_date', appointment.appointment_date)
            .eq('booking_slot', bookingSlot)
            .in('status', ['Accepted', 'Completed']);

        if (slotError) throw slotError;
        if (slotMatches.length > 0) {
            return res.status(409).json({ error: `Serial number ${bookingSlot} is already assigned for this date` });
        }

        const { data: acceptedData, error: acceptError } = await supabase
            .from('appointments')
            .update({ status: 'Accepted', booking_slot: bookingSlot })
            .eq('id', id)
            .select();

        if (acceptError) throw acceptError;

        await supabase.from('notifications').insert([{
            user_id: appointment.user_id,
            message: `Your appointment (ID: ${appointment.appointment_id}) with ${doctor.name} on ${appointment.appointment_date} was accepted. Your serial number is ${bookingSlot}.`
        }]);

        res.status(200).json({ message: `Appointment accepted with serial number ${bookingSlot}`, appointment: acceptedData[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/appointments/:id/reject', async (req, res) => {
    const { id } = req.params;
    const doctorId = String(req.body.doctorId || '').trim();

    if (!doctorId) {
        return res.status(400).json({ error: 'doctorId is required' });
    }

    try {
        const doctor = await getDoctorById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (appointment.doctor_id !== doctor.id) {
            return res.status(403).json({ error: 'This appointment is not assigned to this doctor' });
        }
        if ((appointment.status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ error: 'Only pending appointments can be rejected' });
        }

        const { data: rejectedData, error: rejectError } = await supabase
            .from('appointments')
            .update({ status: 'Rejected', booking_slot: null })
            .eq('id', id)
            .select();

        if (rejectError) throw rejectError;

        await supabase.from('notifications').insert([{
            user_id: appointment.user_id,
            message: `Your appointment request with ${doctor.name} on ${appointment.appointment_date} was declined.`
        }]);

        res.status(200).json({ message: 'Appointment rejected', appointment: rejectedData[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 12c. DOCTOR COMPLETE/INCOMPLETE ROUTES ---
app.patch('/api/appointments/:id/complete', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('appointments')
            .update({ status: 'Completed' })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.status(200).json({ message: 'Appointment marked as Completed successfully!', appointment: data?.[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/appointments/:id/incomplete', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('appointments')
            .update({ status: 'Not Completed' })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.status(200).json({ message: 'Appointment marked as Not Completed', appointment: data?.[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 13. CANCEL APPOINTMENT ROUTE ---
app.patch('/api/appointments/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const { data, error } = await supabase
            .from('appointments')
            .update({ status: 'Cancelled', booking_slot: null })
            .eq('id', id)
            .select();

        if (error) throw error;

        // Notify doctor if the appointment was already accepted
        if (appointment.doctor_id && appointment.status === 'Accepted') {
            await supabase.from('notifications').insert([{
                doctor_id: appointment.doctor_id,
                message: `Patient ${appointment.patient_name} has cancelled their appointment for ${appointment.appointment_date}.`
            }]);
        }

        res.status(200).json({ message: 'Appointment cancelled successfully', appointment: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 14. DOCTOR NOTIFICATIONS ROUTE ---
app.get('/api/doctors/:id/notifications', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('doctor_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 14a. FETCH UNREAD NOTIFICATION COUNT ---
app.get('/api/doctors/:id/notifications/unread-count', async (req, res) => {
    const { id } = req.params;
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', id)
            .eq('is_read', false);

        if (error) throw error;
        res.status(200).json({ unreadCount: count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 14b. MARK NOTIFICATIONS AS READ ---
app.patch('/api/doctors/:id/notifications/read', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('doctor_id', id)
            .eq('is_read', false);

        if (error) throw error;
        res.status(200).json({ message: 'Notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/doctors/:id/notifications', async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Doctor ID is required" });
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('doctor_id', id);

        if (error) throw error;
        res.status(200).json({ message: 'All notifications cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});