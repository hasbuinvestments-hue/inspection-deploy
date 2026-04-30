const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xrcraomnvnzpjktvksre.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyY3Jhb21udm56cGprdHZrc3JlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ0NDM3MiwiZXhwIjoyMDkxMDIwMzcyfQ.7H02OXJiq7MqXNpK84StkNuMjceWwX7EFVv9lptU_74";

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const filePath = './data/SIMPLIFIED DATA.xlsx';
const BATCH_SIZE = 100;
const SKIP_SHEETS = ['PRIMARY', 'Sheet2'];

function excelDataToJSDate(excelDate) {
    if (!excelDate || isNaN(excelDate)) return null;
    try {
        return new Date((excelDate - 25569) * 86400 * 1000).toISOString().split('T')[0];
    } catch (e) {
        return null;
    }
}

async function fixUpload() {
    try {
        console.log('--- 🚀 DATA FIX UPLOAD STARTED ---');
        console.log(`📡 Target: ${SUPABASE_URL}`);
        
        // 1. Clear existing data
        console.log('🧹 Clearing existing data from dependent tables...');
        
        console.log(' - Clearing "activity_logs"...');
        await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        console.log(' - Clearing "inspections"...');
        const { error: inspectionDeleteError } = await supabase.from('inspections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (inspectionDeleteError) {
            console.error('❌ Failed to clear inspections:', inspectionDeleteError.message);
            // We might continue if it's just RLS, but if it's a FK elsewhere, we'll hit it.
        }

        console.log('🧹 Clearing existing data from "businesses" table...');
        const { error: deleteError } = await supabase.from('businesses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) {
            console.error('❌ Failed to clear table:', deleteError.message);
            return;
        }
        console.log('✅ Table cleared successfully.');

        // 2. Read Excel Workbook
        console.log('📂 Reading Excel workbook...');
        const workbook = XLSX.readFile(filePath);
        const allSheets = workbook.SheetNames.filter(name => !SKIP_SHEETS.includes(name));
        
        console.log(`📄 Found ${allSheets.length} subcounty sheets to process.`);
        
        let grandTotalUploaded = 0;

        // 3. Iterate through each subcounty sheet
        for (const sheetName of allSheets) {
            console.log(`\n--- Processing Subcounty: "${sheetName}" ---`);
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(sheet);
            
            if (rawData.length === 0) {
                console.log('   (Empty sheet, skipping)');
                continue;
            }

            console.log(`   Found ${rawData.length.toLocaleString()} rows.`);
            let sheetUploaded = 0;

            for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
                const batch = rawData.slice(i, i + BATCH_SIZE).map(row => ({
                    application_no: row['Application No'] || null,
                    permit_no: row['Permit No.'] || null,
                    customer_name: row['Customer Name'] || null,
                    business_name: row['Business Name'] || null,
                    subcounty_name: sheetName, // CRITICAL: Use sheet name as subcounty
                    ward_name: row['Ward Name'] || null,
                    building_name: row['Building Name'] || null,
                    plot_no: row['Plot No.'] || null,
                    street_name: row['Street Name'] || null,
                    stall_no: row['Stall No.'] || null,
                    payment_plan: row['Payment Plan'] || null,
                    application_stage: row['Application Stage'] || null,
                    issued_date: excelDataToJSDate(row['Issued Date']),
                    business_description: row['Business Description'] || null,
                    business_subsidiary_name: row['Business Subsidiary Name'] || null,
                    owner_mobile_number: String(row['Owner Mobile Number'] || ''),
                    owner_address: row['Owner Address'] || null,
                    contact_person: row['Contact Person'] || null,
                    contact_person_mobile_no: String(row['Contact Person Mobile No'] || ''),
                    contact_person_email: row['Contact Person Email'] || null,
                    permit_start_date: excelDataToJSDate(row['Permit Start Date']),
                    permit_expiry_date: excelDataToJSDate(row['Permit Expiry Date']),
                    permit_duration: row['Permit Duration.'] || null,
                    permit_status: row['Permit Status'] || null,
                    ubp_permit_fee: parseFloat(row['UBP Permit Fee']) || 0,
                    invoice_no: row['Invoice No'] || null,
                    paid: !!row['Paid'],
                    payment_ref: row['Payment Ref'] || null
                }));

                const { error: insertError } = await supabase.from('businesses').insert(batch);
                
                if (insertError) {
                    console.error(`   ❌ Batch error in "${sheetName}":`, insertError.message);
                    break;
                }
                
                sheetUploaded += batch.length;
                const progress = ((sheetUploaded / rawData.length) * 100).toFixed(1);
                process.stdout.write(`\r   🚀 Progress: ${progress}% (${sheetUploaded.toLocaleString()} / ${rawData.length.toLocaleString()} rows)`);
            }
            
            grandTotalUploaded += sheetUploaded;
            console.log(`\n   ✅ Finished "${sheetName}": ${sheetUploaded.toLocaleString()} records.`);
        }

        console.log('\n---------------------------');
        console.log('🏁 DATA FIX UPLOAD COMPLETE!');
        console.log(`✅ Total Records Uploaded: ${grandTotalUploaded.toLocaleString()}`);

        const { count, error: countError } = await supabase.from('businesses').select('*', { count: 'exact', head: true });
        if (!countError) {
            console.log(`📊 FINAL DB TOTAL: ${count.toLocaleString()}`);
        }

    } catch (error) {
        console.error('\n❌ Fatal Error during fix upload:', error.message);
    }
}

fixUpload();
