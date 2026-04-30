const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    "https://xrcraomnvnzpjktvksre.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDQzNzIsImV4cCI6MjA5MTAyMDM3Mn0.9RxBVyLXEuimDRkKnIOSF1W21gPpI_e00gb3N_okanc"
);

async function verifyFinance() {
    console.log("Verifying Finance Manager login...");
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email: 'finance@nairobi.go.ke',
        password: 'Password123!'
    });

    if (error) {
        console.error("Login failed:", error.message);
        return;
    }

    console.log("Login successful. Checking connectivity to inspections...");
    
    // Mimic finance.js data fetch
    const { data, error: fetchError } = await supabase
        .from('inspections')
        .select(`
            *,
            businesses (
                business_name,
                ward_name
            )
        `)
        .limit(5);

    if (fetchError) {
        console.error("Fetch failed (RLS still blocking?):", fetchError.message);
    } else {
        console.log("Fetch successful. Records found:", data.length);
        if (data.length > 0) {
            const amount = parseFloat(data[0].amount_paid) || 0;
            console.log(`Sample breakdown: Total=${amount}, NCCG=${amount * 0.25}, Vendor=${amount * 0.75}`);
        }
    }
}

verifyFinance();
