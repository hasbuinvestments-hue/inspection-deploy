const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://xrcraomnvnzpjktvksre.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0NDM3MiwiZXhwIjoyMDkxMDIwMzcyfQ.7H02OXJiq7MqXNpK84StkNuMjceWwX7EFVv9lptU_74";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStatus() {
    console.log('--- Migration Status Check ---');
    console.log(`URL: ${SUPABASE_URL}`);

    const tables = ['businesses', 'inspections', 'profiles', 'activity_logs', 'audit_logs', 'error_logs', 'report_verification_logs'];
    
    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.log(`❌ Table "${table}": Error - ${error.message}`);
        } else {
            console.log(`✅ Table "${table}": ${count} records`);
        }
    }

    // Check for migrations table
    const { data: migrations, error: migError } = await supabase
        .from('_prisma_migrations')
        .select('*')
        .limit(5);
    
    if (migError) {
        // Try standard supabase/postgrest table
        const { data: migs, error: migsError } = await supabase.rpc('get_migrations'); 
        if (migsError) {
            console.log('❓ Migration tracking table not found or not accessible.');
        } else {
            console.log(`📜 Migrations found: ${migs.length}`);
        }
    } else {
        console.log(`📜 Prisma Migrations found: ${migrations.length}`);
    }

    // Comprehensive distribution check
    const subcounties = [
        "Dagoretti North", "Dagoretti South", "Embakasi Central", "Embakasi East", 
        "Embakasi North", "Embakasi South", "Embakasi West", "Kamkunji", 
        "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", "Roysambu", 
        "Ruaraka", "Starehe", "Westlands", "PRIMARY"
    ];

    console.log('📊 Comprehensive Subcounty Distribution:');
    let totalFound = 0;
    for (const name of subcounties) {
        const { count, error } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('subcounty_name', name);
        
        if (!error && count > 0) {
            console.log(`- ${name}: ${count} records`);
            totalFound += count;
        }
    }
    console.log(`- Others/NULL: ${35534 - totalFound}`);
}

checkStatus();
