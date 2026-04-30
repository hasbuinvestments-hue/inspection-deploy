// Initialize Supabase for NCCG Officer
const _nccgSupabase = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

// State
let currentTab = 'pending';
let reports = [];
let map = null;
let mapMarkers = [];

// DOM Elements
const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');
const declineModal = document.getElementById('decline-modal');
const declineForm = document.getElementById('decline-form');

// Auth Guard
(async function initNCCG() {
    const authResult = await AuthProvider.checkAuth(['nccg_officer', 'super_admin']);
    if (!authResult) return;

    // Initial Data Load
    fetchReports();
})();

// -- TAB SWITCHING --
function switchTab(tabId) {
    currentTab = tabId;
    renderReports();
    
    if (tabId === 'map') {
        setTimeout(initMap, 50); // Delay slightly to ensure tab DOM is visible
    }
}

window.UiHelpers.initTabs({
    tabs,
    tabContents,
    initialTab: currentTab,
    activateInitial: false,
    titleElement: tabTitle,
    titles: {
        pending: 'Pending Approvals',
        history: 'Review History',
        map: 'Geographic Overview'
    },
    onSwitch: switchTab
});

// -- DATA FETCHING --
let currentPhoFilter = '';
let currentZoneFilter = '';
let currentSearch = '';
const NCCG_PAGE_SIZE = 12;
const queueState = {
    pendingPage: 0,
    pendingTotal: 0,
    historyPage: 0,
    historyTotal: 0
};
let pendingReports = [];
let historyReports = [];

document.getElementById('filter-pho')?.addEventListener('change', async (e) => {
    currentPhoFilter = e.target.value;
    queueState.pendingPage = 0;
    queueState.historyPage = 0;
    await fetchReports();
});
document.getElementById('filter-zone')?.addEventListener('change', async (e) => {
    currentZoneFilter = e.target.value;
    queueState.pendingPage = 0;
    queueState.historyPage = 0;
    await fetchReports();
});
document.getElementById('filter-search')?.addEventListener('input', async (e) => {
    currentSearch = e.target.value.toLowerCase();
    queueState.pendingPage = 0;
    queueState.historyPage = 0;
    await fetchReports();
});

function applyQueueFilters(query) {
    let nextQuery = query;

    if (currentPhoFilter) nextQuery = nextQuery.eq('inspector_id', currentPhoFilter);
    if (currentZoneFilter) nextQuery = nextQuery.or(`ward_name.eq.${currentZoneFilter},subcounty_name.eq.${currentZoneFilter}`, { foreignTable: 'businesses' });
    if (currentSearch) nextQuery = nextQuery.or(`business_name.ilike.%${currentSearch}%,permit_no.ilike.%${currentSearch}%`, { foreignTable: 'businesses' });

    return nextQuery;
}

async function fetchReports() {
    // 1. Fetch PHO UUIDs assigned to this NCCG Officer
    const { data: myPhos, error: phoError } = await _nccgSupabase
        .from('user_profiles')
        .select('id, full_name, zone')
        .eq('assigned_nccg_id', window.CURRENT_PROFILE.id);

    if (phoError) {
        console.error("Error fetching assigned PHOs:", phoError);
        return;
    }

    const assignedIds = myPhos.map(p => p.id);

    // Populate Filters
    const phoSelect = document.getElementById('filter-pho');
    const zoneSelect = document.getElementById('filter-zone');
    if (phoSelect && phoSelect.options.length === 1) {
        myPhos.forEach(p => phoSelect.appendChild(new Option(p.full_name, p.id)));
    }
    if (zoneSelect && zoneSelect.options.length === 1) {
        const uniqueZones = [...new Set(myPhos.map(p => p.zone).filter(Boolean))];
        uniqueZones.forEach(z => zoneSelect.appendChild(new Option(z, z)));
    }

    if (assignedIds.length === 0) {
        reports = [];
        pendingReports = [];
        historyReports = [];
        renderReports();
        return;
    }

    const baseSelect = `
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
    `;

    const pendingFrom = queueState.pendingPage * NCCG_PAGE_SIZE;
    const pendingTo = pendingFrom + NCCG_PAGE_SIZE - 1;
    const historyFrom = queueState.historyPage * NCCG_PAGE_SIZE;
    const historyTo = historyFrom + NCCG_PAGE_SIZE - 1;

    let pendingQuery = _nccgSupabase
        .from('inspections')
        .select(baseSelect, { count: 'exact' })
        .in('inspector_id', assignedIds)
        .eq('is_draft', false)
        .eq('approval_status', 'pending')
        .order('inspection_date', { ascending: false })
        .range(pendingFrom, pendingTo);

    let historyQuery = _nccgSupabase
        .from('inspections')
        .select(baseSelect, { count: 'exact' })
        .in('inspector_id', assignedIds)
        .eq('is_draft', false)
        .in('approval_status', ['approved', 'declined'])
        .order('inspection_date', { ascending: false })
        .range(historyFrom, historyTo);

    pendingQuery = applyQueueFilters(pendingQuery);
    historyQuery = applyQueueFilters(historyQuery);

    const [{ data: pendingData, error: pendingError, count: pendingCount }, { data: historyData, error: historyError, count: historyCount }] = await Promise.all([
        pendingQuery,
        historyQuery
    ]);

    if (pendingError) {
        console.error("Error fetching pending reports:", pendingError);
        return;
    }
    if (historyError) {
        console.error("Error fetching history reports:", historyError);
        return;
    }

    pendingReports = (pendingData || []).map(r => ({ ...r, approval_status: r.approval_status || 'pending' }));
    historyReports = (historyData || []).map(r => ({ ...r, approval_status: r.approval_status || 'pending' }));
    reports = [...pendingReports, ...historyReports];
    queueState.pendingTotal = pendingCount || 0;
    queueState.historyTotal = historyCount || 0;
    
    renderReports();
}

// -- RENDERING --
function renderReports() {
    const pendingTbody = document.querySelector('#pending-table tbody');
    const historyTbody = document.querySelector('#history-table tbody');

    function getWaitTimeStr(dateStr) {
        if(!dateStr) return '—';
        const ms = new Date() - new Date(dateStr);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        if (hours < 24) return `${hours} hrs`;
        const days = Math.floor(hours / 24);
        return `<span class="badge ${days > 3 ? 'badge-red' : (days > 1 ? 'badge-amber' : 'badge-green')}">${days} days</span>`;
    }

    // Render Pending
    if (pendingTbody) {
        pendingTbody.innerHTML = pendingReports.length > 0 ? pendingReports.map(report => `
            <tr>
                <td>${getWaitTimeStr(report.created_at || report.inspection_date)}</td>
                <td>${report.businesses?.business_name || '—'}</td>
                <td>${report.inspector_name}</td>
                <td>${report.businesses?.ward_name || report.zone || '—'}</td>
                <td><b>${report.overall_sanitation_rating || '—'}</b></td>
                <td>
                    <button class="btn-text" onclick="viewPanelReport('${report.id}')" style="background:#f1f5f9; padding:0.4rem 0.8rem; border-radius:6px; color:#0f172a !important;">Review Panel</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #64748b;">No pending reports off queue.</td></tr>';
    }

    // Render History
    if (historyTbody) {
        historyTbody.innerHTML = historyReports.length > 0 ? historyReports.map(report => `
            <tr>
                <td>${new Date(report.inspection_date).toLocaleDateString()}</td>
                <td>${report.businesses?.business_name || '—'}</td>
                <td>${report.inspector_name}</td>
                <td>
                    <span class="badge ${report.approval_status === 'approved' ? 'badge-green' : 'badge-red'}">
                        ${report.approval_status.toUpperCase()}
                    </span>
                </td>
                <td>
                    ${report.approval_status === 'declined' ? `<span style="font-size:0.75rem;color:#64748b;">Reason: ${report.nccg_notes || '—'}</span>` : `<button class="btn-text" onclick="viewReport('${report.id}')">View PDF</button>`}
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #64748b;">No review history.</td></tr>';
    }

    window.UiHelpers.renderPagination('nccg-pending-pagination', {
        page: queueState.pendingPage,
        totalPages: Math.ceil(queueState.pendingTotal / NCCG_PAGE_SIZE),
        label: 'Pending page',
        onPrev: async () => {
            queueState.pendingPage -= 1;
            await fetchReports();
        },
        onNext: async () => {
            queueState.pendingPage += 1;
            await fetchReports();
        }
    });

    window.UiHelpers.renderPagination('nccg-history-pagination', {
        page: queueState.historyPage,
        totalPages: Math.ceil(queueState.historyTotal / NCCG_PAGE_SIZE),
        label: 'History page',
        onPrev: async () => {
            queueState.historyPage -= 1;
            await fetchReports();
        },
        onNext: async () => {
            queueState.historyPage += 1;
            await fetchReports();
        }
    });
}

// -- ACTIONS --

window.viewPanelReport = (id) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    const grid = document.getElementById('viewer-grid-content');
    
    // Prepare photo thumbnails
    const photos = report.photo_urls || [];
    const photoHtml = photos.length > 0 ? photos.map(url => `<img src="${url}" style="width:100px; height:70px; object-fit:cover; border-radius:4px; margin:2px;" onclick="window.open('${url}','_blank')">`).join('') : '<span style="color:#64748b;">No photos attached</span>';

    grid.innerHTML = `
        <div class="viewer-card">
            <h3>Overview</h3>
            <div class="data-row"><span class="data-label">Business:</span><span class="data-val">${report.businesses?.business_name || '—'}</span></div>
            <div class="data-row"><span class="data-label">Permit:</span><span class="data-val">${report.businesses?.permit_no || '—'}</span></div>
            <div class="data-row"><span class="data-label">Inspector (PHO):</span><span class="data-val">${report.inspector_name || '—'}</span></div>
            <div class="data-row"><span class="data-label">Service Type:</span><span class="data-val">${report.service_type || '—'}</span></div>
            <div class="data-row"><span class="data-label">Wait Time:</span><span class="data-val">${new Date(report.created_at || report.inspection_date).toLocaleString()}</span></div>
        </div>
        
        <div class="viewer-card">
            <h3>Assessment Ratings</h3>
            <div class="data-row"><span class="data-label">Housekeeping:</span><span class="data-val">${report.housekeeping_rating || '—'}</span></div>
            <div class="data-row"><span class="data-label">Waste Mgmt:</span><span class="data-val">${report.waste_management_rating || '—'}</span></div>
            <div class="data-row"><span class="data-label">Stacking:</span><span class="data-val">${report.stacking_rating || '—'}</span></div>
            <div class="data-row" style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px dashed #cbd5e1;"><span class="data-label">Overall Sanitation:</span><span class="data-val" style="font-weight:800; color:#ef4444;">${report.overall_sanitation_rating || '—'}</span></div>
        </div>
        
        <div class="viewer-card" style="grid-column: 1 / -1;">
            <h3>Photos & Evidence</h3>
            <div>${photoHtml}</div>
        </div>
        
        <div class="viewer-card" style="grid-column: 1 / -1;">
            <h3>Detailed Notes</h3>
            <p style="font-size:0.85rem; color:#475569; margin:0;">${report.notes || 'No extra notes provided.'}</p>
        </div>
    `;

    document.getElementById('viewer-btn-approve').onclick = () => {
        document.getElementById('report-viewer-modal').classList.remove('open');
        approveReport(id);
    };
    document.getElementById('viewer-btn-decline').onclick = () => {
        document.getElementById('report-viewer-modal').classList.remove('open');
        openDeclineModal(id);
    };

    document.getElementById('report-viewer-modal').classList.add('open');
};

window.approveReport = async (id) => {
    if (!confirm("Are you sure you want to approve this report? It will become visible to Admins and Collections.")) return;

    try {
        const { error } = await _nccgSupabase
            .from('inspections')
            .update({
                approval_status: 'approved',
                nccg_officer_name: window.CURRENT_PROFILE.full_name,
                approved_at: new Date().toISOString(),
                nccg_notes: null, // clear any previous decline notes
                decline_reason: null
            })
            .eq('id', id);

        if (error) throw error;

        // Log
        ActivityTracker.log('report_approved', `Approved inspection report for report ID: ${id}`);
        fetchReports(); // Refresh
        
    } catch (err) {
        alert("Failed to approve report: " + err.message);
    }
};

window.openDeclineModal = (id) => {
    document.getElementById('decline-report-id').value = id;
    document.getElementById('decline-reason').value = '';
    document.getElementById('decline-notes').value = '';
    declineModal.classList.add('open');
};

document.getElementById('btn-close-modal').onclick = () => {
    declineModal.classList.remove('open');
};

declineForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('decline-report-id').value;
    const reason = document.getElementById('decline-reason').value;
    const notes = document.getElementById('decline-notes').value;
    const btn = declineForm.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.textContent = 'Declining...';

    try {
        const { error } = await _nccgSupabase
            .from('inspections')
            .update({
                approval_status: 'declined',
                nccg_officer_name: window.CURRENT_PROFILE.full_name,
                decline_reason: reason,
                nccg_notes: notes,
                approved_at: null // clear previous approval if it was somehow toggled
            })
            .eq('id', id);

        if (error) throw error;

        ActivityTracker.log('report_declined', `Declined inspection report for report ID: ${id}`, { reason, notes });
        declineModal.classList.remove('open');
        fetchReports(); // Refresh

    } catch (err) {
        alert("Failed to decline report: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Decline';
    }
};

window.viewReport = (id) => {
    const report = reports.find(r => r.id === id);
    if (report) {
        downloadReport(id);
    }
};

window.downloadReport = async (id) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    
    const formatted = {
        ...report,
        client: report.businesses
    };
    
    await generatePDF(formatted);
};

// --- PDF GENERATION CORE ---

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

        let logoData = await fetchImageAsDataUrl('src/nairobi_logo.png');

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 14;
        const usableW = pageW - margin * 2;
        let y = margin;

        const GREEN  = [16, 185, 129];
        const DARK   = [30, 41, 59];
        const GRAY   = [100, 116, 139];

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

        // ── HEADER ──
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

        // ── CLIENT INFO ──
        sectionBar('CLIENT INFORMATION');
        row('Business:', c.business_name, pageW/2, 'Permit No:', c.permit_no);
        row('Location:', (`${c.building_name||''} ${c.street_name||''}`).trim() || '—', pageW/2, 'Contact:', c.contact_person);
        if (c.contact_email) row('Email:', c.contact_email);
        y += 2;

        // ── INSPECTION DETAILS ──
        sectionBar('INSPECTION DETAILS');
        row('Date & Time:', new Date(r.inspection_date).toLocaleString(), pageW/2, 'Inspector:', r.inspector_name);
        row('Personnel:', (r.personnel || []).join(', ') || '—', pageW/2, 'Service Type:', r.service_type || '—');
        y += 2;

        // ── RESULTS ──
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

        // ── PHOTOS ──
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

// -- MAP LOGIC --
function initMap() {
    if (map) {
        map.invalidateSize();
        updateMapMarkers();
        return;
    }
    
    // Default to Nairobi Center
    map = L.map('nccg-map').setView([-1.2921, 36.8219], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    updateMapMarkers();
}

function updateMapMarkers() {
    if (!map) return;
    
    // Clear old markers
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];

    // Filter to only pending reports
    const pendingReports = reports.filter(r => r.approval_status === 'pending');

    pendingReports.forEach(r => {
        if (r.gps_coordinates && r.gps_coordinates.lat && r.gps_coordinates.lng) {
            const marker = L.marker([r.gps_coordinates.lat, r.gps_coordinates.lng]).addTo(map)
                .bindPopup(`
                    <strong style="display:block; margin-bottom:5px;">${r.businesses?.business_name || 'Business'}</strong>
                    <div style="font-size:0.8rem; margin-bottom:5px;"><b>PHO:</b> ${r.inspector_name || '—'}</div>
                    <div style="font-size:0.8rem; margin-bottom:8px;"><b>Wait Time:</b> ${new Date(r.created_at || r.inspection_date).toLocaleDateString()}</div>
                    <button class="action-button approve" onclick="viewPanelReport('${r.id}')" style="background:#2563eb; width:100%;">Review Panel</button>
                `);
            mapMarkers.push(marker);
        }
    });

    if (mapMarkers.length > 0) {
        const group = new L.featureGroup(mapMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}
