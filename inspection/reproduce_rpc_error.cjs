const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testCreationAndLogin() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Login as Super Admin to have permission to call RPC
    console.log('Logging in as Super Admin...');
    const { data: adminAuth, error: adminError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@nairobi.go.ke',
        password: 'Password123!'
    });

    if (adminError) {
        console.error('Admin Login Error:', adminError.message);
        return;
    }

    const testEmail = `test_user_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    console.log(`Attempting to create user ${testEmail}...`);
    
    // 2. Call the RPC to create a new admin
    const { data: newUserId, error: rpcError } = await supabase.rpc('admin_create_user', {
        p_email: testEmail,
        p_password: testPassword,
        p_full_name: 'Test Login User',
        p_role: 'admin',
        p_staff_id: `STAFF-${Date.now()}`,
        p_zone: ''
    });

    if (rpcError) {
        console.error('RPC Error:', rpcError.message);
        return;
    }

    console.log('User created successfully ID:', newUserId);

    // 3. Logout Super Admin
    await supabase.auth.signOut();

    // 4. Attempt to login as the new user
    console.log(`Attempting to login as new user ${testEmail}...`);
    const { data: userAuth, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });

    if (loginError) {
        console.error('Login Failed for new user:', loginError.message);
    } else {
        console.log('✅ SUCCESS: New user logged in successfully!');
    }
}

testCreationAndLogin();
