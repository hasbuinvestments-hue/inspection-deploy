const fs = require('fs');
const path = require('path');

function read(relativePath) {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function expectMatch(filePath, pattern, message) {
    const contents = read(filePath);
    if (!pattern.test(contents)) {
        throw new Error(`${filePath}: ${message}`);
    }
}

function runChecks() {
    expectMatch(
        'src/auth.js',
        /redirectForProfile\(profile\)/,
        'expected centralized role redirect helper usage'
    );

    expectMatch(
        'login.html',
        /AuthProvider\.redirectForProfile\(profile\)/,
        'expected login flow to use centralized role redirects'
    );

    expectMatch(
        'admin.html',
        /<option value="finance_manager">Finance Manager<\/option>/,
        'expected Finance Manager option in admin personnel form'
    );

    expectMatch(
        'src/app.js',
        /inspector_id:\s*window\.CURRENT_PROFILE\?\.id \|\| null/,
        'expected inspection submissions to persist inspector_id'
    );

    expectMatch(
        'src/app.js',
        /payment_status:\s*isPaid \? 'collected_on_ground' : 'pending'/,
        'expected PHO payment capture to feed finance verification workflow'
    );

    expectMatch(
        'src/nccg.js',
        /\.in\('inspector_id', assignedIds\)/,
        'expected NCCG queue to load reports by inspector_id'
    );

    expectMatch(
        'src/nccg.js',
        /nextQuery = nextQuery\.eq\('inspector_id', currentPhoFilter\)/,
        'expected NCCG PHO filter to use server-side inspector ID filtering'
    );

    expectMatch(
        'src/admin.js',
        /nextQuery = nextQuery\.eq\('inspector_id', filters\.inspector\);/,
        'expected admin report filter to use inspector IDs'
    );

    expectMatch(
        'src/admin.js',
        /const pendingQueue = nccg\.pending_queue \|\| 0;/,
        'expected admin supervision metrics to use inspector IDs'
    );

    expectMatch(
        'src/finance.js',
        /payment_status:\s*'verified_by_finance'/,
        'expected finance verification status update'
    );

    console.log('Role workflow checks passed.');
}

try {
    runChecks();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
