const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expectMatch(filePath, pattern, message) {
    const contents = read(filePath);
    if (!pattern.test(contents)) {
        throw new Error(`${filePath}: ${message}`);
    }
}

function runChecks() {
    // 1. Auth / Login Integrity
    expectMatch(
        'src/contexts/AuthContext.jsx',
        /resolve_staff_login_email/,
        'expected staff-id login resolution via secure RPC'
    );
    expectMatch(
        'src/contexts/AuthContext.jsx',
        /signInWithPassword/,
        'expected Supabase password login for auth flow'
    );
    expectMatch(
        'src/contexts/AuthContext.jsx',
        /!profileData\?\.is_active/,
        'expected inactive-account guard after login'
    );

    // 2. PHO Submission Integrity
    expectMatch(
        'src/pages/PHO/InspectionForm.jsx',
        /is_draft:\s*isDraft/,
        'expected inspection submissions to persist is_draft boolean'
    );
    expectMatch(
        'src/pages/PHO/InspectionForm.jsx',
        /payment_status:\s*formData\.is_paid \? 'collected_on_ground' : 'pending'/,
        'expected PHO payment capture to feed finance verification workflow'
    );
    expectMatch(
        'src/pages/PHO/InspectionForm.jsx',
        /personnel:\s*formData\.personnel/,
        'expected personnel list persistence'
    );
    expectMatch(
        'src/pages/PHO/PHOHistory.jsx',
        /onResume\(full\)/,
        'expected draft resume to pass full record context'
    );
    expectMatch(
        'src/pages/PHO/PHOHistory.jsx',
        /isDraftReport/,
        'expected draft detection to support is_draft and approval_status draft states'
    );

    // 3. NCCG Scoping + Review Actions
    expectMatch(
        'src/pages/NCCG/NccgTable.jsx',
        /inFilters:.*inspector_id/,
        'expected NCCG queue to load reports by inspector_id scope'
    );
    expectMatch(
        'src/pages/NCCG/NccgReviewModal.jsx',
        /approval_status:\s*'approved'/,
        'expected NCCG approve action to update approval_status'
    );
    expectMatch(
        'src/pages/NCCG/NccgReviewModal.jsx',
        /approval_status:\s*'declined'/,
        'expected NCCG decline action to update approval_status'
    );

    // 4. Finance Verification Actions
    expectMatch(
        'src/pages/Finance/FinanceTable.jsx',
        /payment_status:\s*'verified_by_finance'/,
        'expected finance verify action to set verified status'
    );
    expectMatch(
        'src/pages/Finance/FinanceTable.jsx',
        /payment_status:\s*'flagged'/,
        'expected finance flag action to set flagged status'
    );

    // 5. Admin Supervision
    expectMatch(
        'src/pages/Admin/SupervisionMetrics.jsx',
        /supabase\.rpc\('get_admin_dashboard_metrics'\)/,
        'expected admin supervision to use server-side metrics RPC'
    );

    // 6. Data Access Defaults
    expectMatch(
        'src/hooks/usePaginatedData.js',
        /const client = supabase;/,
        'expected data hook to use configured anon client by default'
    );

    // 7. Report Verification (anti-impersonation)
    expectMatch(
        'src/App.jsx',
        /path=\"\/verify\"/,
        'expected public verify route'
    );
    expectMatch(
        'src/App.jsx',
        /path=\"\/verify\/:code\"/,
        'expected verify route with code parameter'
    );
    expectMatch(
        'src/lib/pdfGenerator.js',
        /Verification Code:/,
        'expected PDF to include verification code'
    );
    expectMatch(
        'src/lib/pdfGenerator.js',
        /\/verify\//,
        'expected PDF to include verification URL'
    );
    expectMatch(
        'migrations/20_report_verification.sql',
        /verify_report_public/,
        'expected DB migration to expose public verification RPC'
    );
    expectMatch(
        'migrations/19_resolve_staff_login_email.sql',
        /resolve_staff_login_email/,
        'expected DB migration for staff-id login resolution'
    );

    console.log('React Role workflow checks passed.');
}

try {
    runChecks();
} catch (error) {
    console.error('TEST FAILED: ' + error.message);
    process.exit(1);
}
