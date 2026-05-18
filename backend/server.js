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

// --- SIGNUP ROUTE ---
app.post('/api/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // In a real app, you MUST hash the password using bcrypt before storing it!
        // const bcrypt = require('bcrypt');
        // const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPassword = password; // PLACEHOLDER

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
        res.status(201).json({ message: 'User registered successfully', user: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGIN ROUTE ---
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
        
        if (users.length === 0 || users[0].password_hash !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
