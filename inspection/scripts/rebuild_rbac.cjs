const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xrcraomnvnzpjktvksre.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0NDM3MiwiZXhwIjoyMDkxMDIwMzcyfQ.7H02OXJiq7MqXNpK84StkNuMjceWwX7EFVv9lptU_74";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function rebuild() {
    console.log('--- 🚀 RBAC REBUILD STARTED ---');

    // 1. List all users
    console.log('🔍 Listing all auth users...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
        console.error('❌ Failed to list users:', listError.message);
        return;
    }

    console.log(`🗑️ Found ${users.length} users. Deleting them...`);

    // 2. Delete all users
    for (const user of users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error(`  - Failed to delete ${user.email}:`, deleteError.message);
        } else {
            console.log(`  - Deleted ${user.email}`);
        }
    }

    // 3. Create fresh Super Admin
    console.log('\n✨ Creating fresh Super Admin account...');
    const adminEmail = 'superadmin@nairobi.go.ke';
    const adminPass = 'Password123!';

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPass,
        email_confirm: true
    });

    if (authError) {
        console.error('❌ Failed to create Super Admin:', authError.message);
        return;
    }

    console.log(`✅ Auth account created for ${adminEmail}`);

    // 4. Link profile in user_profiles
    // Note: The SQL migration should have cleared user_profiles already.
    const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
            id: authData.user.id,
            full_name: 'System Owner',
            role: 'super_admin',
            is_active: true
        });

    if (profileError) {
        console.error('❌ Failed to link profile:', profileError.message);
    } else {
        console.log('✅ Super Admin profile linked successfully.');
    }

    console.log('\n🏁 RBAC REBUILD COMPLETE!');
}

rebuild();
