const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLS() {
    console.log('Checking RLS policies on user_profiles...');
    
    // We can't query pg_policy directly via Postgrest easily unless we use an RPC
    // Let's create an RPC for diagnostics if we can, or just try to fetch profiles as service role
    
    const { data: policies, error: polError } = await supabase.rpc('debug_get_policies', { table_name: 'user_profiles' });
    
    if (polError) {
        console.log('RPC debug_get_policies not found. Attempting to create it...');
        const sql = `
            CREATE OR REPLACE FUNCTION debug_get_policies(table_name text)
            RETURNS TABLE(policy_name text, cmd text, roles text[], qual text, with_check text) 
            SECURITY DEFINER
            AS $$
            BEGIN
                RETURN QUERY 
                SELECT 
                    polname::text, 
                    polcmd::text, 
                    ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(polroles))::text[],
                    pg_get_expr(polqual, polrelid)::text,
                    pg_get_expr(polwithcheck, polrelid)::text
                FROM pg_policy 
                JOIN pg_class ON pg_policy.polrelid = pg_class.oid 
                WHERE relname = table_name;
            END;
            $$ LANGUAGE plpgsql;
        `;
        // We can't run raw SQL via supabase-js easily without an RPC.
        // I'll try to run it via a command line tool if available, or just use another approach.
        console.log('Cannot create RPC via JS. Please run this in SQL Editor:');
        console.log(sql);
    } else {
        console.table(policies);
    }

    console.log('Checking get_my_role function details...');
    const { data: funcDetails, error: funcError } = await supabase.rpc('debug_get_function', { func_name: 'get_my_role' });
    
    if (funcError) {
         console.log('RPC debug_get_function not found.');
    } else {
        console.table(funcDetails);
    }
}

checkRLS();
