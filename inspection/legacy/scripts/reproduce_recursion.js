const { createClient } = require('@supabase/supabase-js');

// Using ANON key like the frontend does
const supabase = createClient(
    "https://xrcraomnvnzpjktvksre.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDQzNzIsImV4cCI6MjA5MTAyMDM3Mn0.9RxBVyLXEuimDRkKnIOSF1W21gPpI_e00gb3N_okanc"
);

async function reproduceRecursion() {
    console.log("Attempting to fetch profiles with ANON key...");
    
    // We need to be "logged in" for RLS to trigger the specific policies
    // But even a simple select might trigger it if there are public policies or if it checks auth.uid()
    
    // Let's try to sign in first as the superadmin
    console.log("Signing in as superadmin...");
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'superadmin@nairobi.go.ke',
        password: 'Password123!'
    });

    if (loginError) {
        console.error("Login Error:", loginError.message);
        return;
    }

    console.log("Login successful. UID:", session.user.id);

    // Now try to fetch the profile
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error("Error fetching profile (Hypothesis: Infinite Recursion):", error.message);
    } else {
        console.log("Profile fetched successfully:", data.full_name);
    }
}

reproduceRecursion();
