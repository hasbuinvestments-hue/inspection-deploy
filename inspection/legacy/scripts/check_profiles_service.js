const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    "https://xrcraomnvnzpjktvksre.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0NDM3MiwiZXhwIjoyMDkxMDIwMzcyfQ.7H02OXJiq7MqXNpK84StkNuMjceWwX7EFVv9lptU_74"
);

async function checkProfilesServiceRole() {
    console.log("Checking profiles using Service Role (bypassing RLS)...");
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*');

    if (error) {
        console.error("Error fetching profiles:", error.message);
    } else {
        console.log("Found profiles:", data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkProfilesServiceRole();
