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

async function listAllUsers() {
    console.log("Listing all auth users...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Error listing users:", error.message);
    } else {
        console.log("Found users:", users.length);
        users.forEach(u => {
            console.log(`- ${u.email} (ID: ${u.id})`);
        });
    }
}

listAllUsers();
