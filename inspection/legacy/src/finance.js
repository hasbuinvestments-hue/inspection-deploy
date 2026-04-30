// Initialize Supabase for Finance Manager - Use Service Role to bypass RLS issues
const _financeSupabase = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.serviceRoleKey);

// State
let currentTab = 'overview';
let financeSummary = null;
let currentCollections = [];
let currentRecentCollections = [];
let currentOverduePayments = [];
const FINANCE_PAGE_SIZE = 15;
const financeState = {
    paymentsPage: 0,
    overduePage: 0,
    paymentsTotal: 0,
    overdueTotal: 0
};

// DOM Elements
const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');

// Auth Guard
(async function initFinance() {
    const authResult = await AuthProvider.checkAuth(['finance_manager', 'admin', 'super_admin']);
    if (!authResult) return;

    // Initial Data Load
    fetchPayments();
})();

// -- TAB SWITCHING --
function switchTab(tabId) {
    currentTab = tabId;
}

window.UiHelpers.initTabs({
    tabs,
    tabContents,
    initialTab: currentTab,
    activateInitial: false,
    titleElement: tabTitle,
    titles: {
        overview: 'Revenue Overview',
        payments: 'All Collections',
        overdue: 'Overdue Accounts'
    },
    onSwitch: switchTab
});

// -- DATA FETCHING --
async function fetchPayments() {
    try {
        await Promise.all([
            fetchFinanceSummary(),
            fetchRecentCollections(),
            fetchCollectionPage(),
            fetchOverduePage()
        ]);
    } catch (err) {
        console.error('Error fetching payments:', err);
    }
}

function getFinanceFilters() {
    return {
        search: document.getElementById('filter-search')?.value?.trim() || '',
        start: document.getElementById('filter-start')?.value || null,
        end: document.getElementById('filter-end')?.value || null,
        status: document.getElementById('filter-status')?.value || 'all'
    };
}

function applyCommonFinanceSearch(query, search) {
    if (!search) return query;
    return query.or(`payment_ref.ilike.%${search}%,businesses.business_name.ilike.%${search}%`);
}

function applyDateRange(query, column, start, end) {
    let nextQuery = query;
    if (start) nextQuery = nextQuery.gte(column, start);
    if (end) nextQuery = nextQuery.lte(column, `${end}T23:59:59`);
    return nextQuery;
}

function applyCollectionStatusFilter(query, status) {
    let nextQuery = query.eq('is_paid', true);

    if (status === 'collected_on_ground' || status === 'verified_by_finance' || status === 'flagged') {
        nextQuery = nextQuery.eq('payment_status', status);
    } else if (status === 'unpaid' || status === 'overdue') {
        nextQuery = nextQuery.eq('id', '__none__');
    }

    return nextQuery;
}

function applyOverdueStatusFilter(query, status) {
    let nextQuery = query.eq('status', 'completed').eq('is_paid', false);

    if (status === 'flagged') {
        nextQuery = nextQuery.eq('payment_status', 'flagged');
    } else if (status === 'collected_on_ground' || status === 'verified_by_finance') {
        nextQuery = nextQuery.eq('id', '__none__');
    } else if (status === 'unpaid' || status === 'overdue') {
        nextQuery = nextQuery.in('payment_status', ['pending', 'unpaid']);
    }

    return nextQuery;
}

async function fetchFinanceSummary() {
    const filters = getFinanceFilters();
    const { data, error } = await _financeSupabase.rpc('get_finance_summary', {
        p_search: filters.search || null,
        p_start: filters.start,
        p_end: filters.end,
        p_status: filters.status
    });

    if (error) throw error;
    financeSummary = data;
    updateStats();
}

async function fetchRecentCollections() {
    const filters = getFinanceFilters();
    let query = _financeSupabase
        .from('inspections')
        .select(`
            id,
            payment_date,
            amount_paid,
            payment_ref,
            payment_status,
            businesses!inner (
                business_name,
                permit_no,
                ward_name
            )
        `)
        .order('payment_date', { ascending: false })
        .limit(10);

    query = applyCommonFinanceSearch(query, filters.search);
    query = applyDateRange(query, 'payment_date', filters.start, filters.end);
    query = applyCollectionStatusFilter(query, filters.status);

    const { data, error } = await query;
    if (error) throw error;
    currentRecentCollections = data || [];
    renderRecentCollections();
}

async function fetchCollectionPage() {
    const filters = getFinanceFilters();
    const from = financeState.paymentsPage * FINANCE_PAGE_SIZE;
    const to = from + FINANCE_PAGE_SIZE - 1;

    let query = _financeSupabase
        .from('inspections')
        .select(`
            id,
            inspection_date,
            payment_date,
            amount_paid,
            payment_ref,
            payment_status,
            payment_method,
            payment_collected_by,
            payment_verified_by,
            finance_verification_notes,
            payment_notes,
            service_type,
            calculated_fee,
            businesses!inner (
                business_name,
                permit_no,
                ward_name
            )
        `, { count: 'exact' })
        .order('payment_date', { ascending: false })
        .range(from, to);

    query = applyCommonFinanceSearch(query, filters.search);
    query = applyDateRange(query, 'payment_date', filters.start, filters.end);
    query = applyCollectionStatusFilter(query, filters.status);

    const { data, error, count } = await query;
    if (error) throw error;
    currentCollections = data || [];
    financeState.paymentsTotal = count || 0;
    renderPayments();
}

async function fetchOverduePage() {
    const filters = getFinanceFilters();
    const from = financeState.overduePage * FINANCE_PAGE_SIZE;
    const to = from + FINANCE_PAGE_SIZE - 1;

    let query = _financeSupabase
        .from('inspections')
        .select(`
            id,
            inspection_date,
            amount_paid,
            payment_ref,
            payment_status,
            payment_method,
            payment_collected_by,
            payment_verified_by,
            finance_verification_notes,
            payment_notes,
            service_type,
            calculated_fee,
            businesses!inner (
                business_name,
                permit_no,
                ward_name
            )
        `, { count: 'exact' })
        .order('inspection_date', { ascending: false })
        .range(from, to);

    query = applyCommonFinanceSearch(query, filters.search);
    query = applyDateRange(query, 'inspection_date', filters.start, filters.end);
    query = applyOverdueStatusFilter(query, filters.status);

    const { data, error, count } = await query;
    if (error) throw error;
    currentOverduePayments = data || [];
    financeState.overdueTotal = count || 0;
    renderPayments();
}

window.applyFilters = async function() {
    financeState.paymentsPage = 0;
    financeState.overduePage = 0;
    await fetchPayments();
};

function updateStats() {
    const summary = financeSummary || {};
    document.getElementById('stat-today').textContent = `KES ${Number(summary.today_revenue || 0).toLocaleString()}`;
    document.getElementById('stat-month').textContent = `KES ${Number(summary.month_revenue || 0).toLocaleString()}`;
    document.getElementById('stat-total-revenue').textContent = `KES ${Number(summary.total_revenue || 0).toLocaleString()}`;
    document.getElementById('stat-pending-val').textContent = `KES ${Number(summary.pending_value || 0).toLocaleString()}`;
    document.getElementById('stat-avg-days').textContent = summary.avg_days_to_pay || 0;
}

function renderRecentCollections() {
    const recentTbody = document.querySelector('#recent-collections-table tbody');
    if (!recentTbody) return;

    recentTbody.innerHTML = currentRecentCollections.map(p => `
        <tr>
            <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</td>
            <td>${p.businesses?.business_name || '—'}</td>
            <td>KES ${p.amount_paid?.toLocaleString() || '0'}</td>
            <td>${p.payment_ref || '—'} <button class="btn-text" onclick="openPaymentModal('${p.id}')" style="margin-left: 5px;">View</button></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;">No recent activity.</td></tr>';
}

function renderPayments() {
    const collectionsTbody = document.querySelector('#collections-table tbody');
    const overdueTbody = document.querySelector('#overdue-table tbody');

    const collectionRows = currentCollections.map(p => `
        <tr>
            <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—'}</td>
            <td>${p.businesses?.business_name || '—'}</td>
            <td><strong>KES ${p.amount_paid?.toLocaleString() || '0'}</strong></td>
            <td>
                <code>${p.payment_ref || '—'}</code>
                <button class="btn-text" onclick="openPaymentModal('${p.id}')" style="margin-left: 10px; color: #2563eb;">Details</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;">No collections match criteria.</td></tr>';

    if (collectionsTbody) collectionsTbody.innerHTML = collectionRows;
    if (overdueTbody) overdueTbody.innerHTML = currentOverduePayments.map(p => `
        <tr>
            <td>${p.businesses?.business_name || '—'}</td>
            <td>${new Date(p.inspection_date).toLocaleDateString()}</td>
            <td><span style="color:#ef4444; font-weight:700;">PENDING</span></td>
            <td><button class="btn-text" onclick="openPaymentModal('${p.id}')">Resolve Payment</button></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;">No overdue payments match criteria!</td></tr>';

    window.UiHelpers.renderPagination('finance-payments-pagination', {
        page: financeState.paymentsPage,
        totalPages: Math.ceil(financeState.paymentsTotal / FINANCE_PAGE_SIZE),
        label: 'Collections page',
        onPrev: async () => {
            financeState.paymentsPage -= 1;
            await fetchCollectionPage();
        },
        onNext: async () => {
            financeState.paymentsPage += 1;
            await fetchCollectionPage();
        }
    });

    window.UiHelpers.renderPagination('finance-overdue-pagination', {
        page: financeState.overduePage,
        totalPages: Math.ceil(financeState.overdueTotal / FINANCE_PAGE_SIZE),
        label: 'Overdue page',
        onPrev: async () => {
            financeState.overduePage -= 1;
            await fetchOverduePage();
        },
        onNext: async () => {
            financeState.overduePage += 1;
            await fetchOverduePage();
        }
    });
}

// -- PAYMENT MODAL LOGIC --
window.openPaymentModal = (id) => {
    const pmt = [...currentCollections, ...currentOverduePayments, ...currentRecentCollections].find(p => p.id === id);
    if (!pmt) return;
    
    document.getElementById('pmt-id').value = id;
    document.getElementById('pmt-busi').textContent = pmt.businesses?.business_name || '—';
    document.getElementById('pmt-permit').textContent = pmt.businesses?.permit_no || '—';
    document.getElementById('pmt-date').textContent = new Date(pmt.inspection_date).toLocaleDateString();
    
    // Basic fee demo calculation (can be improved)
    let fee = parseFloat(pmt.amount_paid);
    if (!fee && pmt.service_type === 'routine_inspection') fee = 5000;
    else if (!fee) fee = 3000;
    
    document.getElementById('pmt-fee').textContent = fee.toLocaleString();
    
    const badge = document.getElementById('pmt-status-badge');
    const pStatus = pmt.payment_status || (pmt.is_paid ? 'verified_by_finance' : 'pending');
    
    document.getElementById('pmt-method').textContent = pmt.payment_method || '—';
    document.getElementById('pmt-collected-by').textContent = pmt.payment_collected_by || '—';
    document.getElementById('pmt-verified-by').textContent = pmt.payment_verified_by || '—';

    document.getElementById('btn-verify').style.display = 'none';
    document.getElementById('btn-flag').style.display = 'none';
    document.getElementById('btn-reverse').style.display = 'none';

    if (pStatus === 'verified_by_finance') {
        badge.textContent = 'VERIFIED';
        badge.className = 'badge badge-green';
        document.getElementById('pmt-overdue-days').textContent = '';
        document.getElementById('btn-reverse').style.display = 'block';
    } else if (pStatus === 'collected_on_ground') {
        badge.textContent = 'IN REVIEW';
        badge.className = 'badge badge-amber';
        document.getElementById('pmt-overdue-days').textContent = '(Pending Finance Verification)';
        document.getElementById('btn-verify').style.display = 'block';
        document.getElementById('btn-flag').style.display = 'block';
    } else if (pStatus === 'flagged') {
        badge.textContent = 'FLAGGED';
        badge.className = 'badge badge-red';
        document.getElementById('pmt-overdue-days').textContent = '';
        document.getElementById('btn-verify').style.display = 'block';
    } else {
        badge.textContent = 'UNPAID';
        badge.className = 'badge badge-red';
        const days = Math.floor((new Date() - new Date(pmt.inspection_date)) / (1000 * 60 * 60 * 24));
        document.getElementById('pmt-overdue-days').textContent = `(${days} days pending)`;
    }
    
    document.getElementById('pmt-ref').value = pmt.payment_ref || '';
    document.getElementById('pmt-notes').value = pmt.payment_notes || pmt.finance_verification_notes || '';
    document.getElementById('payment-modal').style.display = 'flex';
};

window.verifyPayment = async () => {
    const id = document.getElementById('pmt-id').value;
    const ref = document.getElementById('pmt-ref').value;
    const notes = document.getElementById('pmt-notes').value;
    const feeRaw = document.getElementById('pmt-fee').textContent.replace(/,/g, '');
    
    if (!ref) {
        alert("Please provide a payment reference (M-Pesa/Bank) before verifying.");
        return;
    }
    
    try {
        const { error } = await _financeSupabase
            .from('inspections')
            .update({
                is_paid: true,
                payment_status: 'verified_by_finance',
                payment_verified_by: window.CURRENT_PROFILE?.id || 'finance_admin',
                payment_ref: ref,
                amount_paid: parseFloat(feeRaw),
                finance_verification_notes: notes
            })
            .eq('id', id);
            
        if (error) throw error;
        
        logFinanceActivity('payment_verified', `Verified payment for ${id}. Ref: ${ref}`);
        alert('Payment verified successfully!');
        document.getElementById('payment-modal').style.display = 'none';
        fetchPayments();
    } catch (err) {
        alert("Failed to verify payment: " + err.message);
    }
};

window.flagPayment = async () => {
    const id = document.getElementById('pmt-id').value;
    const notes = document.getElementById('pmt-notes').value;
    
    if (!notes) {
        alert("Please provide notes explaining why this payment is flagged.");
        return;
    }

    try {
        const { error } = await _financeSupabase
            .from('inspections')
            .update({
                payment_status: 'flagged',
                finance_verification_notes: notes
            })
            .eq('id', id);
            
        if (error) throw error;
        
        logFinanceActivity('payment_flagged', `Flagged payment for ${id} due to mismatch.`);
        alert('Payment flagged successfully!');
        document.getElementById('payment-modal').style.display = 'none';
        fetchPayments();
    } catch (err) {
        alert("Failed to flag payment: " + err.message);
    }
};

window.updatePaymentInfo = async () => {
    const id = document.getElementById('pmt-id').value;
    const ref = document.getElementById('pmt-ref').value;
    const notes = document.getElementById('pmt-notes').value;
    
    try {
        const { error } = await _financeSupabase
            .from('inspections')
            .update({
                payment_ref: ref,
                payment_notes: notes,
                contacted_on: new Date().toISOString()
            })
            .eq('id', id);
            
        if (error) throw error;
        
        logFinanceActivity('payment_info_update', `Updated notes/ref for ${id}`);
        alert('Information updated successfully!');
        document.getElementById('payment-modal').style.display = 'none';
        fetchPayments();
    } catch (err) {
        alert("Failed to update: " + err.message);
    }
};

window.reversePayment = async () => {
    if(!confirm("WARNING: This will mark the transaction as UNPAID. Are you sure?")) return;
    
    const id = document.getElementById('pmt-id').value;
    const notes = document.getElementById('pmt-notes').value;
    
    try {
        const { error } = await _financeSupabase
            .from('inspections')
            .update({
                is_paid: false,
                payment_date: null,
                payment_ref: null,
                amount_paid: 0,
                payment_notes: notes ? notes + "\n[REVERSED]" : "[REVERSED]"
            })
            .eq('id', id);
            
        if (error) throw error;
        
        logFinanceActivity('payment_reversed', `Reversed payment for ${id}.`);
        alert('Payment reversed successfully.');
        document.getElementById('payment-modal').style.display = 'none';
        fetchPayments();
    } catch (err) {
        alert("Failed to reverse payment: " + err.message);
    }
};

// -- AUDIT & EXPORT --
function logFinanceActivity(type, description) {
    if(window.ActivityTracker && window.CURRENT_PROFILE) {
        window.ActivityTracker.log(type, description, { module: 'finance' });
    }
}

window.exportToCSV = () => {
    let csv = "Date,Business,Permit,Amount,Status,Ref\n";
    [...currentCollections, ...currentOverduePayments].forEach(p => {
        const d = p.payment_date ? new Date(p.payment_date).toLocaleDateString() : new Date(p.inspection_date).toLocaleDateString();
        const b = `"${p.businesses?.business_name || ''}"`;
        const permit = `"${p.businesses?.permit_no || ''}"`;
        const amt = p.amount_paid || 0;
        const status = p.is_paid ? "PAID" : "UNPAID";
        const ref = `"${p.payment_ref || ''}"`;
        csv += `${d},${b},${permit},${amt},${status},${ref}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "finance_export.csv";
    a.click();
};
