const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRpc() {
    console.log('Testing rpc.get_my_role()...');
    const { data, error } = await supabase.rpc('get_my_role');
    
    if (error) {
        console.error('RPC Error:', error.message);
        if (error.message.includes('recursion')) {
            console.error('CONFIRMED: get_my_role() itself is causing recursion!');
        }
    } else {
        console.log('Current Role (Service Role Context):', data);
    }
}

testRpc();
