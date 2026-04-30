// Initialize Supabase for Admin
const _adminSub = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
// Service role client — used for bypassing RLS + Rate Limits during inspector creation
const _serviceSub = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// State
let currentTab = 'overview';
let activeInspectors = [];
let zoneReports = [];
let allPayments = []; // New global for payments
let map = null;
let recentActivityReports = [];
let declinedReports = [];
let paidPayments = [];
let overduePayments = [];
let adminMetrics = {
    pho_metrics: [],
    nccg_metrics: [],
    exceptions: []
};
const reportCache = new Map();
const ADMIN_PAGE_SIZE = 12;
const adminPaging = {
    reportsPage: 0,
    reportsTotal: 0,
    declinedPage: 0,
    declinedTotal: 0,
    paymentsPage: 0,
    paymentsTotal: 0,
    overduePage: 0,
    overdueTotal: 0
};

// DOM Elements
const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');
const inspectorModal = document.getElementById('inspector-modal');
const addInspectorForm = document.getElementById('add-inspector-form');

// Auth Guard
(async function initAdmin() {
    const authResult = await AuthProvider.checkAuth(['admin', 'super_admin']);
    if (!authResult) return;

    const profile = authResult.profile;
    document.getElementById('admin-zone').textContent = profile.zone ? `Zone: ${profile.zone}` : 'Global Administrator';
    document.getElementById('stat-zone-name').textContent = profile.zone || 'All Zones';

    // Initial Data Load
    loadDashboardData();
})();

// -- TAB SWITCHING --
function switchTab(tabId) {
    currentTab = tabId;

    // Lazy load/refresh specific tab data
    if (tabId === 'map') initMap();
    if (tabId === 'inspectors') fetchInspectors();
    if (tabId === 'reports') fetchReports();
    if (tabId === 'declined') fetchReports();
    if (tabId === 'payments') fetchPayments();
}

window.UiHelpers.initTabs({
    tabs,
    tabContents,
    initialTab: currentTab,
    activateInitial: false,
    titleElement: tabTitle,
    titles: {
        overview: 'Dashboard Overview',
        inspectors: 'Staff Registry',
        supervision: 'PHO/NCCG Metrics',
        alerts: 'Alerts & Exceptions',
        reports: 'Approved Reports',
        declined: 'Declined by NCCG',
        payments: 'Revenue & Overdue',
        map: 'Geographic Overview'
    },
    onSwitch: switchTab
});

// -- DATA FETCHING --

async function loadDashboardData() {
    try {
        await fetchInspectors();
        await Promise.all([
            fetchDashboardMetrics(),
            fetchRecentReports(),
            fetchReports(),
            fetchDeclinedReports(),
            fetchPayments()
        ]);
        await fetchUniqueZones();
    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }
}

let allAvailableZones = [
    "Dagoretti North", "Dagoretti South", 
    "Embakasi Central", "Embakasi East", "Embakasi North", "Embakasi South", "Embakasi West",
    "Kamkunji", "Kasarani", "Kibra", "Langata", "Makadara", "Mathare", 
    "Roysambu", "Ruaraka", "Starehe", "Westlands"
].sort();

async function fetchUniqueZones() {
    // We already have the official registry from the sheet names manifest.
    // This function is now just for debugging or future remote updates.
    console.log("Using official Geographic Registry with", allAvailableZones.length, "zones.");
    // Populate dropdown if it's already open
    if (inspectorModal && inspectorModal.classList.contains('open')) populateZoneDropdown();
}

function populateZoneDropdown() {
    const select = document.getElementById('insp-zone');
    if (!select) return;

    if (allAvailableZones.length === 0) {
        select.innerHTML = '<option value="">No zones found</option>';
        return;
    }

    let options = '<option value="">-- Select Zone --</option>';
    allAvailableZones.forEach(zone => {
        options += `<option value="${zone}">${zone}</option>`;
    });
    select.innerHTML = options;

    // Pre-select admin's zone if applicable
    if (window.CURRENT_PROFILE && window.CURRENT_PROFILE.zone) {
        select.value = window.CURRENT_PROFILE.zone;
    }
}

async function fetchInspectors() {
    let query = _serviceSub
        .from('user_profiles')
        .select('*')
        .in('role', ['inspector', 'nccg_officer', 'finance_manager']);

    const { data: profiles, error: profileError } = await query;
    if (profileError) {
        console.error("Error fetching inspectors:", profileError);
        return;
    }

    // 2. Fetch emails from auth system via service role
    const { data: authList, error: authError } = await _serviceSub.auth.admin.listUsers();

    if (!authError && authList?.users) {
        const emailMap = {};
        authList.users.forEach(u => { emailMap[u.id] = u.email; });
        profiles.forEach(p => { p.email = emailMap[p.id] || '—'; });
    }

    const nccgMap = {};
    profiles.filter(p => p.role === 'nccg_officer').forEach(p => nccgMap[p.id] = p.full_name);
    
    // 3. Map PHOs and NCCG Officers for rendering
    // We keep them all in activeInspectors but they'll be rendered with appropriate labels
    activeInspectors = profiles.map(p => ({
        ...p,
        assigned_nccg_name: nccgMap[p.assigned_nccg_id] || (p.role === 'nccg_officer' ? '—' : 'Unassigned')
    }));
    
    window.nccgProfiles = profiles.filter(p => p.role === 'nccg_officer'); // For allocation modal
    
    renderInspectors();
}

async function fetchReports() {
    const filters = getReportFilters();
    const from = adminPaging.reportsPage * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;

    let query = _serviceSub
        .from('inspections')
        .select(`
            *,
            businesses!inner (
                business_name,
                ward_name,
                subcounty_name,
                permit_no,
                building_name,
                street_name,
                contact_person,
                contact_email
            )
        `, { count: 'exact' })
        .eq('approval_status', 'approved')
        .order('inspection_date', { ascending: false })
        .range(from, to);

    query = applyReportFiltersToQuery(query, filters);

    const { data, error, count } = await query;
    if (error) {
        console.error("Error fetching reports:", error);
        return;
    }

    zoneReports = data || [];
    adminPaging.reportsTotal = count || 0;
    cacheReports(zoneReports);
    populateInspectorFilter();
    renderReports(zoneReports);
}

function getReportFilters() {
    return {
        start: document.getElementById('report-filter-start').value || null,
        end: document.getElementById('report-filter-end').value || null,
        inspector: document.getElementById('report-filter-inspector').value || 'all'
    };
}

function applyReportFiltersToQuery(query, filters) {
    let nextQuery = query;

    if (filters.start) nextQuery = nextQuery.gte('inspection_date', filters.start);
    if (filters.end) nextQuery = nextQuery.lte('inspection_date', `${filters.end}T23:59:59`);
    if (filters.inspector && filters.inspector !== 'all') {
        nextQuery = nextQuery.eq('inspector_id', filters.inspector);
    }

    return nextQuery;
}

function applyFilters() {
    adminPaging.reportsPage = 0;
    adminPaging.declinedPage = 0;
    fetchDashboardMetrics();
    fetchRecentReports();
    fetchReports();
    fetchDeclinedReports();
}

// Wire up filter controls — runs once DOM is ready
document.getElementById('report-filter-inspector').addEventListener('change', applyFilters);
document.getElementById('report-filter-start').addEventListener('change', applyFilters);
document.getElementById('report-filter-end').addEventListener('change', applyFilters);

function populateInspectorFilter() {
    const filterSelect = document.getElementById('report-filter-inspector');
    if (!filterSelect) return;

    const inspectorOptions = activeInspectors
        .filter(profile => profile.role === 'inspector')
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map(profile => `<option value="${profile.id}">${profile.full_name}</option>`)
        .join('');

    filterSelect.innerHTML = '<option value="all">All Personnel</option>' + inspectorOptions;
}

function updateStats() {
    document.getElementById('stat-today-inspections').textContent = adminMetrics.today_count || 0;
    document.getElementById('stat-pending-approvals').textContent = adminMetrics.pending_count || 0;
    document.getElementById('stat-declined-reports').textContent = adminMetrics.declined_count || 0;
    document.getElementById('stat-overdue-payments').textContent = adminMetrics.overdue_count || 0;
    document.getElementById('stat-active-inspectors').textContent = activeInspectors.length;
    
    renderSupervision();
    renderExceptions();
}

function renderSupervision() {
    const phoTbody = document.querySelector('#pho-metrics-table tbody');
    const nccgTbody = document.querySelector('#nccg-metrics-table tbody');
    if (!phoTbody || !nccgTbody) return;

    // PHO Metrics
    phoTbody.innerHTML = (adminMetrics.pho_metrics || []).map(pho => {
        const total = pho.total || 0;
        const approved = pho.approved || 0;
        const declined = pho.declined || 0;
        const pending = pho.pending || 0;
        const appRate = total ? Math.round((approved / total) * 100) + '%' : '—';
        const decRate = total ? Math.round((declined / total) * 100) + '%' : '—';
        let status = '<span class="badge badge-green">Active</span>';
        if (total === 0) status = '<span class="badge badge-amber">Idle / No Data</span>';
        else if (pending > 10) status = '<span class="badge badge-red">Backlogged</span>';

        return `<tr>
            <td><strong>${pho.full_name}</strong><br><small style="color:#64748b;">${pho.zone || 'Unassigned'}</small></td>
            <td>${total} inspections</td>
            <td><b style="color:#10b981;">${appRate}</b></td>
            <td><b style="color:#ef4444;">${decRate}</b></td>
            <td>${status}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;">No PHOs allocated.</td></tr>';

    nccgTbody.innerHTML = (adminMetrics.nccg_metrics || []).map(nccg => {
        const assignedPhos = nccg.assigned_phos || 0;
        const pendingQueue = nccg.pending_queue || 0;
        let status = '<span class="badge badge-green">Balanced</span>';
        if (assignedPhos === 0) status = '<span class="badge badge-amber">No Assigned PHOs</span>';
        else if (pendingQueue > 20) status = '<span class="badge badge-red">Overloaded</span>';

        return `<tr>
            <td><strong>${nccg.full_name}</strong></td>
            <td>${assignedPhos} PHO(s)</td>
            <td><b style="color:#f59e0b;">${pendingQueue} Pending</b></td>
            <td>${status}</td>
            <td><button class="btn-text" onclick="window.openBulkAllocateModal('${nccg.id}', '${nccg.full_name}')" style="color:#2563eb;">Manage Allocations</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;">No NCCG Officers registered.</td></tr>';
}

function renderExceptions() {
    const tbody = document.querySelector('#exceptions-table tbody');
    if(!tbody) return;

    tbody.innerHTML = (adminMetrics.exceptions || []).map(ex => `
        <tr>
            <td>${ex.payment_date ? new Date(ex.payment_date).toLocaleDateString() : (ex.inspection_date ? new Date(ex.inspection_date).toLocaleDateString() : '—')}</td>
            <td>${ex.business_name || '—'}<br><small style="color:#64748b;">${ex.permit_no || ''}</small></td>
            <td><span class="badge ${ex.urgent ? 'badge-red' : 'badge-amber'}">${ex.reason}</span></td>
            <td>${ex.owner || '—'}</td>
            <td><button class="btn-text" onclick="viewReport('${ex.id}')" style="color:#3b82f6;">Investigate</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #10b981;">No active exceptions. All systems nominal.</td></tr>';
}

// -- RENDERING --

function renderInspectors() {
    const tbody = document.querySelector('#inspectors-table tbody');
    tbody.innerHTML = activeInspectors.map(insp => `
        <tr>
            <td>
                <div style="font-weight: 700;">${insp.full_name}</div>
                <div style="font-size: 0.7rem; color: #64748b;">${insp.email || '—'}</div>
                <div class="badge role-${insp.role === 'nccg_officer' ? 'nccg' : (insp.role === 'finance_manager' ? 'finance' : 'insp')}">${insp.role.toUpperCase().replace('_', ' ')}</div>
            </td>
            <td><span class="badge ${insp.role === 'nccg_officer' ? 'badge-amber' : 'badge-blue'}">${insp.zone || 'Global'}</span></td>
            <td>${insp.role === 'nccg_officer' || insp.role === 'finance_manager' ? '<span style="color: #94a3b8;">N/A</span>' : `<strong>${insp.assigned_nccg_name || 'Unassigned'}</strong>`}</td>
            <td><span class="badge ${insp.is_active ? 'badge-green' : 'badge-red'}">${insp.is_active ? 'Active' : 'Locked'}</span><br><small style="color:#94a3b8;">${insp.last_login ? new Date(insp.last_login).toLocaleDateString() : 'Never'}</small></td>
            <td>
                <button class="btn-text" onclick="toggleUserStatus('${insp.id}', ${insp.is_active})" style="color: ${insp.is_active ? '#ef4444' : '#10b981'};">${insp.is_active ? 'Suspend' : 'Activate'}</button>
                <button class="btn-text" onclick="openEditStaffModal('${insp.id}')" style="color: #2563eb; margin-left: 5px;">Edit Staff</button>
            </td>
        </tr>
    `).join('');
}

window.toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    if (!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'suspend'} this user?`)) return;

    try {
        const { error } = await _serviceSub
            .from('user_profiles')
            .update({ is_active: newStatus })
            .eq('id', userId);

        if (error) throw error;
        
        ActivityTracker.log('user_update', `${newStatus ? 'Activated' : 'Suspended'} user account.`, { userId });
        alert(`User ${newStatus ? 'activated' : 'suspended'} successfully.`);
        fetchInspectors(); // Refresh the table
    } catch (err) {
        alert("Action failed: " + err.message);
    }
};

function renderReports(items = null) {
    const mainTbody = document.querySelector('#full-reports-table tbody');
    const recentTbody = document.querySelector('#recent-reports-table tbody');
    const declinedTbody = document.querySelector('#declined-reports-table tbody');

    if (mainTbody) {
        mainTbody.innerHTML = zoneReports.length > 0 ? zoneReports.map(report => `
            <tr>
                <td>${new Date(report.inspection_date).toLocaleDateString()}</td>
                <td>${report.businesses.business_name}</td>
                <td>${report.inspector_name}</td>
                <td>${report.service_type || '—'}</td>
                <td>
                    <button class="btn-text" onclick="viewReport('${report.id}')">View</button>
                    <button class="btn-text" onclick="downloadReport('${report.id}')" style="color: var(--primary); margin-left: 8px;">Download</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #64748b;">No approved reports found.</td></tr>';
    }

    if (declinedTbody) {
        declinedTbody.innerHTML = declinedReports.length > 0 ? declinedReports.map(report => `
            <tr>
                <td>${new Date(report.inspection_date).toLocaleDateString()}</td>
                <td>${report.businesses.business_name}</td>
                <td>${report.inspector_name}</td>
                <td><span style="color:#ef4444; font-size:0.8rem;">Reason: ${report.nccg_notes || 'No reason provided'}</span></td>
            </tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #64748b;">No declined reports in this period.</td></tr>';
    }

    if (recentTbody) {
        recentTbody.innerHTML = recentActivityReports.slice(0, 5).map(report => `
            <tr>
                <td>${new Date(report.inspection_date).toLocaleDateString()}</td>
                <td>${report.businesses.business_name}</td>
                <td>${report.inspector_name}</td>
                <td><span class="badge ${report.approval_status === 'approved' ? 'badge-green' : (report.approval_status === 'declined' ? 'badge-amber' : 'badge-amber')}">${(report.approval_status || 'pending').toUpperCase()}</span></td>
            </tr>
        `).join('');
    }

    window.UiHelpers.renderPagination('reports-pagination', {
        page: adminPaging.reportsPage,
        totalPages: Math.ceil(adminPaging.reportsTotal / ADMIN_PAGE_SIZE),
        label: 'Approved page',
        onPrev: async () => {
            adminPaging.reportsPage -= 1;
            await fetchReports();
        },
        onNext: async () => {
            adminPaging.reportsPage += 1;
            await fetchReports();
        }
    });

    window.UiHelpers.renderPagination('declined-pagination', {
        page: adminPaging.declinedPage,
        totalPages: Math.ceil(adminPaging.declinedTotal / ADMIN_PAGE_SIZE),
        label: 'Declined page',
        onPrev: async () => {
            adminPaging.declinedPage -= 1;
            await fetchDeclinedReports();
        },
        onNext: async () => {
            adminPaging.declinedPage += 1;
            await fetchDeclinedReports();
        }
    });
}

async function fetchPayments() {
    await Promise.all([fetchPaidPayments(), fetchOverduePayments()]);
}

function renderPayments(paid, overdue) {
    const collectionsTbody = document.querySelector('#collections-table tbody');
    const overdueTbody = document.querySelector('#overdue-table tbody');

    if (!collectionsTbody || !overdueTbody) return;

    collectionsTbody.innerHTML = paid.length > 0 ? paid.map(p => `
        <tr>
            <td>${new Date(p.inspection_date).toLocaleDateString()}</td>
            <td>${p.businesses?.business_name || '—'}</td>
            <td style="font-weight:700; color:#10b981;">KES ${(parseFloat(p.amount_paid) || 0).toLocaleString()}</td>
            <td><code>${p.payment_ref || '—'}</code></td>
        </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center; padding:1rem; color:#94a3b8;">No collections yet.</td></tr>';

    overdueTbody.innerHTML = overdue.length > 0 ? overdue.map(o => `
        <tr>
            <td>${o.businesses?.business_name || '—'}</td>
            <td>${new Date(o.inspection_date).toLocaleDateString()}</td>
            <td style="color:#ef4444; font-weight:700;">UNPAID</td>
            <td><span class="badge badge-blue">${o.businesses?.subcounty_name || o.businesses?.ward_name || '—'}</span></td>
        </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center; padding:1rem; color:#94a3b8;">All clear! No overdue payments.</td></tr>';

    window.UiHelpers.renderPagination('admin-payments-pagination', {
        page: adminPaging.paymentsPage,
        totalPages: Math.ceil(adminPaging.paymentsTotal / ADMIN_PAGE_SIZE),
        label: 'Collections page',
        onPrev: async () => {
            adminPaging.paymentsPage -= 1;
            await fetchPaidPayments();
        },
        onNext: async () => {
            adminPaging.paymentsPage += 1;
            await fetchPaidPayments();
        }
    });

    window.UiHelpers.renderPagination('admin-overdue-pagination', {
        page: adminPaging.overduePage,
        totalPages: Math.ceil(adminPaging.overdueTotal / ADMIN_PAGE_SIZE),
        label: 'Overdue page',
        onPrev: async () => {
            adminPaging.overduePage -= 1;
            await fetchOverduePayments();
        },
        onNext: async () => {
            adminPaging.overduePage += 1;
            await fetchOverduePayments();
        }
    });
}

function cacheReports(items = []) {
    items.forEach(item => reportCache.set(item.id, item));
}

async function fetchDashboardMetrics() {
    const profileZone = window.CURRENT_PROFILE?.zone || null;
    const { data, error } = await _serviceSub.rpc('get_admin_dashboard_metrics', {
        p_zone: profileZone
    });

    if (error) {
        console.error('Error fetching admin dashboard metrics:', error);
        return;
    }

    adminMetrics = data || adminMetrics;
    updateStats();
}

async function fetchRecentReports() {
    let query = _serviceSub
        .from('inspections')
        .select(`
            *,
            businesses!inner (
                business_name,
                ward_name,
                subcounty_name,
                permit_no
            )
        `)
        .order('inspection_date', { ascending: false })
        .limit(5);

    query = applyReportFiltersToQuery(query, getReportFilters());

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching recent reports:', error);
        return;
    }

    recentActivityReports = data || [];
    cacheReports(recentActivityReports);
    renderReports();
}

async function fetchDeclinedReports() {
    const filters = getReportFilters();
    const from = adminPaging.declinedPage * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;

    let query = _serviceSub
        .from('inspections')
        .select(`
            *,
            businesses!inner (
                business_name,
                ward_name,
                subcounty_name,
                permit_no
            )
        `, { count: 'exact' })
        .eq('approval_status', 'declined')
        .order('inspection_date', { ascending: false })
        .range(from, to);

    query = applyReportFiltersToQuery(query, filters);

    const { data, error, count } = await query;
    if (error) {
        console.error('Error fetching declined reports:', error);
        return;
    }

    declinedReports = data || [];
    adminPaging.declinedTotal = count || 0;
    cacheReports(declinedReports);
    renderReports();
}

async function fetchPaidPayments() {
    const from = adminPaging.paymentsPage * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;
    const { data, error, count } = await _serviceSub
        .from('inspections')
        .select(`
            id,
            inspection_date,
            amount_paid,
            payment_ref,
            businesses (
                business_name,
                subcounty_name,
                ward_name
            )
        `, { count: 'exact' })
        .eq('is_paid', true)
        .order('inspection_date', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching paid payments:', error);
        return;
    }

    paidPayments = data || [];
    adminPaging.paymentsTotal = count || 0;
    renderPayments(paidPayments, overduePayments);
}

async function fetchOverduePayments() {
    const from = adminPaging.overduePage * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;
    const { data, error, count } = await _serviceSub
        .from('inspections')
        .select(`
            id,
            inspection_date,
            amount_paid,
            businesses (
                business_name,
                subcounty_name,
                ward_name
            )
        `, { count: 'exact' })
        .eq('is_paid', false)
        .eq('status', 'completed')
        .order('inspection_date', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching overdue payments:', error);
        return;
    }

    overduePayments = data || [];
    adminPaging.overdueTotal = count || 0;
    renderPayments(paidPayments, overduePayments);
}

// -- ACTIONS --

document.getElementById('btn-add-inspector').onclick = () => {
    inspectorModal.classList.add('open');
    populateZoneDropdown();
};

document.getElementById('btn-close-modal').onclick = () => {
    inspectorModal.classList.remove('open');
};

// -- EDIT STAFF LOGIC --
const transferModal = document.getElementById('transfer-modal'); // Re-using transfer modal DOM for "Edit Staff"
const closeTransferBtn = document.getElementById('btn-close-transfer');
const saveTransferBtn = document.getElementById('btn-save-transfer');

window.openEditStaffModal = (id) => {
    const user = activeInspectors.find(u => u.id === id);
    if (!user) return;

    document.getElementById('edit-inspector-id').value = id;
    const zoneSelect = document.getElementById('edit-zone-select');
    const nccgSelect = document.getElementById('edit-nccg-select');
    
    // Populate Zones
    let zOptions = '<option value="">-- Select Zone --</option>';
    allAvailableZones.forEach(zone => {
        zOptions += `<option value="${zone}" ${zone === user.zone ? 'selected' : ''}>${zone}</option>`;
    });
    zoneSelect.innerHTML = zOptions;

    // Populate NCCG (Only editable if role is inspector)
    if (user.role === 'inspector') {
        nccgSelect.disabled = false;
        let nOptions = '<option value="">-- Assign NCCG Officer --</option>';
        window.nccgProfiles.forEach(nccg => {
            nOptions += `<option value="${nccg.id}" ${nccg.id === user.assigned_nccg_id ? 'selected' : ''}>${nccg.full_name}</option>`;
        });
        nccgSelect.innerHTML = nOptions;
    } else {
        nccgSelect.disabled = true;
        nccgSelect.innerHTML = '<option value="">N/A for this role</option>';
    }

    transferModal.classList.add('open');
};

closeTransferBtn.onclick = () => transferModal.classList.remove('open');

saveTransferBtn.onclick = async () => {
    const id = document.getElementById('edit-inspector-id').value;
    const newZone = document.getElementById('edit-zone-select').value;
    const newNccg = document.getElementById('edit-nccg-select').value;
    
    saveTransferBtn.disabled = true;
    saveTransferBtn.textContent = 'Saving...';
    
    try {
        const updateData = { zone: newZone };
        if (newNccg) updateData.assigned_nccg_id = newNccg;

        const { error } = await _serviceSub
            .from('user_profiles')
            .update(updateData)
            .eq('id', id);
            
        if (error) throw error;
        
        ActivityTracker.log('user_update', `Updated Staff Details`, { userId: id });
        
        alert('Staff details saved successfully.');
        transferModal.classList.remove('open');
        fetchInspectors(); // Refresh list
    } catch (err) {
        alert('Save failed: ' + err.message);
    } finally {
        saveTransferBtn.disabled = false;
        saveTransferBtn.textContent = 'Save Staff Updates';
    }
};

// -- BULK ALLOCATION LOGIC --
window.openBulkAllocateModal = (nccgId, nccgName) => {
    document.getElementById('bulk-nccg-name').textContent = nccgName;
    document.getElementById('bulk-nccg-id').value = nccgId;
    
    // Find all PHOs that are either unassigned or assigned to someone else
    const phos = activeInspectors.filter(i => i.role === 'inspector');
    const phoListHtml = phos.map(p => `
        <label style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-weight:500;">
            <input type="checkbox" class="bulk-pho-check" value="${p.id}" ${p.assigned_nccg_id === nccgId ? 'checked' : ''} style="width: auto!important;">
            ${p.full_name} <span style="color:#64748b; font-size:0.75rem;">(${p.zone || 'No Zone'})</span>
        </label>
    `).join('') || '<p style="color:#64748b; text-align:center;">No PHOs found.</p>';
    
    document.getElementById('bulk-pho-list').innerHTML = phoListHtml;
    document.getElementById('bulk-allocate-modal').classList.add('open');
};

document.getElementById('btn-save-bulk-allocate').onclick = async () => {
    const nccgId = document.getElementById('bulk-nccg-id').value;
    const btn = document.getElementById('btn-save-bulk-allocate');
    
    const checkboxes = document.querySelectorAll('.bulk-pho-check');
    const selectedPhoIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        // Technically this should be handled by a more robust RPC call if there are hundreds, 
        // but since it's just an MVP setting foreign keys we'll map updates.
        // Option 1: Update all selected PHOs to nccgId
        // Option 2: Remove nccgId from un-checked PHOs that previously had it.
        const unselectedPhoIds = Array.from(checkboxes).filter(cb => !cb.checked).map(cb => cb.value);

        if (selectedPhoIds.length > 0) {
            const { error: setErr } = await _serviceSub
                .from('user_profiles')
                .update({ assigned_nccg_id: nccgId })
                .in('id', selectedPhoIds);
            if(setErr) throw setErr;
        }

        // Only clear unselected PHOs if they were assigned to THIS specific NCCG officer
        const previouslyMineButNowUnchecked = activeInspectors
            .filter(i => i.assigned_nccg_id === nccgId && unselectedPhoIds.includes(i.id))
            .map(i => i.id);

        if (previouslyMineButNowUnchecked.length > 0) {
            const { error: clearErr } = await _serviceSub
                .from('user_profiles')
                .update({ assigned_nccg_id: null })
                .in('id', previouslyMineButNowUnchecked);
            if(clearErr) throw clearErr;
        }

        ActivityTracker.log('system_config', `Bulk updated PHO allocations for ${nccgId}`, { nccgId, count: selectedPhoIds.length });
        alert('Bulk assignment completed successfully!');
        document.getElementById('bulk-allocate-modal').classList.remove('open');
        fetchInspectors(); // Refresh UI
    } catch(err) {
        alert("Failed to assign PHOs: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Complete Allocation';
    }
};

addInspectorForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = addInspectorForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    const email = document.getElementById('insp-email').value;
    const password = document.getElementById('insp-password').value;
    const fullName = document.getElementById('insp-name').value;
    const badge = document.getElementById('insp-badge').value;
    const zone = document.getElementById('insp-zone').value;
    const role = document.getElementById('insp-role').value;

    try {
        // 1. Create auth user using service role (instant confirmation)
        const { data: authData, error: authError } = await _serviceSub.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) throw authError;

        // 2. Create profile using service role (bypasses RLS)
        const { error: profileError } = await _serviceSub
            .from('user_profiles')
            .insert({
                id: authData.user.id,
                full_name: fullName,
                role: role,
                zone: zone,
                badge_number: badge,
                created_by: window.CURRENT_PROFILE.id
            });

        if (profileError) throw profileError;

        // Log activity: Account Created
        ActivityTracker.log('user_create', `Provisioned new ${role} account for ${fullName}`, { role: role, zone: zone });

        alert(`${role === 'nccg_officer' ? 'NCCG Officer' : 'PHO'} account created successfully!`);
        inspectorModal.classList.remove('open');
        addInspectorForm.reset();
        fetchInspectors();
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
};

window.viewReport = (id) => {
    const report = reportCache.get(id);
    if (report) {
        // For now, view is same as download
        downloadReport(id);
    }
};

window.downloadReport = async (id) => {
    let report = reportCache.get(id);
    if (!report) {
        const { data, error } = await _serviceSub
            .from('inspections')
            .select(`
                *,
                businesses (
                    business_name,
                    ward_name,
                    subcounty_name,
                    permit_no,
                    building_name,
                    street_name,
                    contact_person,
                    contact_email
                )
            `)
            .eq('id', id)
            .single();

        if (error || !data) return;
        report = data;
        reportCache.set(id, report);
    }
    
    // Ensure it's formatted for generatePDF
    const formatted = {
        ...report,
        client: report.businesses
    };
    
    await generatePDF(formatted);
};

// --- PDF GENERATION (ADAPTED FROM APP.JS) ---

async function fetchImageAsDataUrl(url) {
    try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Image fetch failed:', url, e);
        return null;
    }
}

async function generatePDF(r) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const c = r.client;

        // Fetch logo for header
        let logoData = await fetchImageAsDataUrl('src/nairobi_logo.png');

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 14;
        const usableW = pageW - margin * 2;
        let y = margin;

        const GREEN  = [16, 185, 129];
        const DARK   = [30, 41, 59];
        const GRAY   = [100, 116, 139];
        // const LGRAY  = [226, 232, 240]; // reserved for future table borders

        function checkPage(needed = 10) {
            if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
        }

        function sectionBar(title) {
            checkPage(14);
            doc.setFillColor(...GREEN);
            doc.roundedRect(margin, y, usableW, 8, 1, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin + 3, y + 5.5);
            y += 12;
            doc.setTextColor(...DARK);
            doc.setFont('helvetica', 'normal');
        }

        function row(label, value, x2, label2, value2) {
            checkPage(7);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GRAY);
            doc.text(label, margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...DARK);
            doc.text(String(value || '—'), margin + 32, y);
            if (x2 && label2) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...GRAY);
                doc.text(label2, x2, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...DARK);
                doc.text(String(value2 || '—'), x2 + 32, y);
            }
            y += 6;
        }

        function bullets(items) {
            if (!items || items.length === 0) {
                checkPage(6);
                doc.setFontSize(8);
                doc.setTextColor(...GRAY);
                doc.text('None recorded', margin + 3, y);
                y += 6;
                return;
            }
            items.forEach(item => {
                checkPage(6);
                doc.setFontSize(8);
                doc.setTextColor(...DARK);
                const lines = doc.splitTextToSize('• ' + item, usableW - 5);
                doc.text(lines, margin + 3, y);
                y += lines.length * 5.5;
            });
        }

        // ── HEADER ───────────────────────────────────────────────────────────
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, pageW, 55, 'F');
        if (logoData) doc.addImage(logoData, 'PNG', pageW/2 - 14, 8, 28, 28);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('NAIROBI CITY GOVERNMENT', pageW/2, 42, { align: 'center' });
        doc.setFontSize(10);
        doc.text('INTEGRATED PEST CONTROL MANAGEMENT AUDIT REPORT', pageW/2, 48, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated: ' + new Date().toLocaleString(), margin, 60);
        y = 68;

        // ── CLIENT INFO ─────────────────────────────────────────────
        sectionBar('CLIENT INFORMATION');
        row('Business:', c.business_name, pageW/2, 'Permit No:', c.permit_no);
        row('Location:', (`${c.building_name||''} ${c.street_name||''}`).trim() || '—', pageW/2, 'Contact:', c.contact_person);
        if (c.contact_email) row('Email:', c.contact_email);
        y += 2;

        // ── INSPECTION DETAILS ───────────────────────────────────────────
        sectionBar('INSPECTION DETAILS');
        row('Date & Time:', new Date(r.inspection_date).toLocaleString(), pageW/2, 'Inspector:', r.inspector_name);
        row('Personnel:', (r.personnel || []).join(', ') || '—', pageW/2, 'Service Type:', r.service_type || '—');
        y += 2;

        // ── RESULTS ──────────────────────────────────────────────
        sectionBar('SANATION ASSESSMENT');
        row('Housekeeping:', r.housekeeping_rating || '—', pageW/2, 'Waste Mgmt:', r.waste_management_rating || '—');
        row('Stacking:', r.stacking_rating || '—', pageW/2, 'Overall:', r.overall_sanitation_rating || '—');
        y += 2;

        sectionBar('ISSUES & RECOMMENDATIONS');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('Issues Found:', margin, y); y += 5;
        bullets(r.issues_found);
        y += 3;
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('Recommendations:', margin, y); y += 5;
        bullets(r.recommendations);
        y += 2;

        // ── PHOTOS ────────────────────────────────────────────────────────
        const photos = r.photo_urls || [];
        if (photos.length > 0) {
            sectionBar('ATTACHED PHOTOS');
            const imgW = (usableW - 5) / 2;
            const imgH = imgW * 0.72;
            let col = 0;

            for (const url of photos) {
                try {
                    const dataUrl = await fetchImageAsDataUrl(url);
                    if (!dataUrl) continue;
                    
                    checkPage(imgH + 10);
                    const x = margin + col * (imgW + 5);
                    doc.addImage(dataUrl, 'JPEG', x, y, imgW, imgH);
                    
                    col++;
                    if (col >= 2) { col = 0; y += imgH + 10; }
                } catch (e) { console.warn('Photo skip:', e); }
            }
            if (col > 0) y += imgH + 10;
        }

        // FOOTER
        const totalPages = doc.internal.getNumberOfPages();
        for(let p=1; p<=totalPages; p++){
            doc.setPage(p);
            doc.setFontSize(7);
            doc.setTextColor(...GRAY);
            doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
            doc.text('Official Nairobi City County Inspection Document', margin, pageH - 6);
        }

        doc.save(`Report_${c.business_name.replace(/\s+/g,'_')}.pdf`);
    } catch (err) {
        console.error('PDF Error:', err);
        alert('Failed to generate PDF: ' + err.message);
    }
}

// -- MAP --

function initMap() {
    if (map) return; // already initialized

    // Center on Nairobi or the zone's primary coordinates
    map = L.map('admin-map').setView([-1.286389, 36.817223], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add pins for inspections
    // Map pins reserved for future lat/lng implementation when businesses table has coordinates
    // zoneReports.forEach(report => { ... });
}

// -- PHO ALLOCATION --

window.openAllocateModal = (id) => {
    document.getElementById('allocate-user-id').value = id;
    const select = document.getElementById('allocate-nccg-select');
    
    // Populate the dropdown with available NCCG officers
    const options = window.nccgProfiles.map(n => `<option value="${n.id}">${n.full_name} (${n.zone || 'Global'})</option>`).join('');
    select.innerHTML = '<option value="">— Select NCCG Officer —</option>' + 
                       '<option value="none">Clear Allocation (Unassign)</option>' + options;

    document.getElementById('allocate-modal').classList.add('open');
};

document.getElementById('allocate-form').onsubmit = async (e) => {
    e.preventDefault();
    const phoId = document.getElementById('allocate-user-id').value;
    const nccgId = document.getElementById('allocate-nccg-select').value;
    const btn = document.getElementById('allocate-form').querySelector('button[type="submit"]');
    
    btn.disabled = true;
    btn.textContent = 'Allocating...';

    try {
        const assignedValue = nccgId === 'none' ? null : nccgId;
        
        const { error } = await _serviceSub
            .from('user_profiles')
            .update({ assigned_nccg_id: assignedValue })
            .eq('id', phoId);

        if (error) throw error;

        // Log activity
        ActivityTracker.log('pho_allocation', `Updated NCCG assignment for PHO.`, { phoId, nccgId: assignedValue });

        alert('NCCG Officer allocated successfully.');
        document.getElementById('allocate-modal').classList.remove('open');
        fetchInspectors(); // Refresh the table
    } catch (err) {
        alert("Failed to allocate: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Assign PHO';
    }
};
