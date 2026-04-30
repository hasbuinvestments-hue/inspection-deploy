const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyLogin() {
    console.log('Attempting to login as Super Admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@nairobi.go.ke',
        password: 'Password123!'
    });

    if (authError) {
        console.error('Auth Error:', authError.message);
        return;
    }

    console.log('Login successful. Attempting to fetch user_profile...');
    
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (profileError) {
        console.error('Profile Fetch Error:', profileError.message);
        if (profileError.message.includes('recursion')) {
            console.error('CRITICAL: Infinite recursion STILL detected!');
        }
    } else {
        console.log('Profile fetched successfully:', profile.full_name, 'Role:', profile.role);
        console.log('SUCCESS: RLS Recursion is resolved.');
    }
}

verifyLogin();
