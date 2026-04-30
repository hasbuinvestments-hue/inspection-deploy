const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to query schema

async function checkSchema() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking auth.users schema...');
    
    const { data: columns, error } = await supabase.rpc('get_table_columns', { 
        p_schema: 'auth', 
        p_table: 'users' 
    });

    if (error) {
        // If RPC doesn't exist, try direct query on information_schema (might fail due to permissions)
        console.error('RPC Error:', error.message);
        console.log('Trying direct query on information_schema...');
        const { data: cols, error: sqlError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_generated, generation_expression')
            .eq('table_schema', 'auth')
            .eq('table_name', 'users');
        
        if (sqlError) {
            console.error('SQL Error:', sqlError.message);
        } else {
            console.table(cols);
        }
    } else {
        console.table(columns);
    }
}

checkSchema();
