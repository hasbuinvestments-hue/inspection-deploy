const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkHashes() {
    console.log('Fetching auth.users hashes...');
    // We can't directly query auth schema via PostgREST unless it's exposed.
    // Usually it's NOT. So this might fail.
    const { data, error } = await supabase.from('users').select('email, encrypted_password').limit(3);

    if (error) {
        console.log('Error querying users (probably auth schema not exposed):', error.message);
        console.log('Trying to use a custom RPC if available...');
        // Let's try to create a temporary RPC to check the hash format
    } else {
        console.log('Sample Hashes:');
        console.table(data);
    }
}

checkHashes();
