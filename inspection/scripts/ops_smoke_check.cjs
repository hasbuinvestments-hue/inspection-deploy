const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function mustExist(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function mustContain(relativePath, snippet) {
  const fullPath = path.join(root, relativePath);
  const contents = fs.readFileSync(fullPath, 'utf8');
  if (!contents.includes(snippet)) {
    throw new Error(`${relativePath} missing required snippet: ${snippet}`);
  }
}

function run() {
  mustExist('migrations/19_resolve_staff_login_email.sql');
  mustExist('migrations/20_report_verification.sql');
  mustExist('migrations/21_performance_hardening.sql');
  mustExist('scripts/check_react_workflows.cjs');
  mustExist('src/pages/Verify/VerifyReport.jsx');

  mustContain('src/App.jsx', 'path="/verify"');
  mustContain('src/lib/pdfGenerator.js', 'Verification Code:');
  mustContain('src/pages/Finance/FinanceTable.jsx', "payment_status: 'verified_by_finance'");
  mustContain('src/pages/NCCG/NccgReviewModal.jsx', "approval_status: 'approved'");

  console.log('Ops smoke check passed.');
}

try {
  run();
} catch (error) {
  console.error(`OPS CHECK FAILED: ${error.message}`);
  process.exit(1);
}
