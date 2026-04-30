const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    "https://xrcraomnvnzpjktvksre.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0NDM3MiwiZXhwIjoyMDkxMDIwMzcyfQ.7H02OXJiq7MqXNpK84StkNuMjceWwX7EFVv9lptU_74",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function createFinanceManager() {
    const email = 'finance@nairobi.go.ke';
    const password = 'Password123!';
    const name = 'Finance Manager';
    const role = 'finance_manager';

    console.log(`Creating ${name} (${email})...`);

    // 1. Create auth user
    const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (authError) {
        if (authError.message.includes("already registered")) {
            console.log("User already exists. Fetching ID...");
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                await linkProfile(existingUser.id, name, role);
            }
        } else {
            console.error("Auth Error:", authError.message);
        }
        return;
    }

    console.log("- Auth account created.");
    await linkProfile(user.id, name, role);
}

async function linkProfile(id, name, role) {
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            id,
            full_name: name,
            role,
            is_active: true
        });

    if (profileError) {
        console.error("- Profile Error:", profileError.message);
    } else {
        console.log("- Profile linked successfully.");
    }
}

createFinanceManager();
