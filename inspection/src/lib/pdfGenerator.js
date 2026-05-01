import { jsPDF } from 'jspdf';
import nairobiLogo from '/nairobi_logo.png';
import { logError } from './logger';
import { getBusinessEmail, getBusinessPhone, getBusinessContactName } from './reportContacts';

export async function generateInspectionPDF(reportData, senderInfo = {}) {
    if (!reportData) return;

    try {
        const doc = new jsPDF();
        
        // Helper to load image as base64 for jsPDF
        const fetchImageAsDataUrl = async (url) => {
            if (!url) return null;
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        };

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

        // Header Background
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, pageW, 55, 'F');

        try {
            const logoBase64 = await fetchImageAsDataUrl(nairobiLogo);
            doc.addImage(logoBase64, 'PNG', pageW / 2 - 14, 8, 28, 28);
        } catch(e) {
            console.warn("Failed to load logo", e);
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('NAIROBI CITY GOVERNMENT', pageW / 2, 42, { align: 'center' });
        doc.setFontSize(10);
        doc.text('INTEGRATED PEST CONTROL MANAGEMENT AUDIT REPORT', pageW / 2, 48, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated: ' + new Date().toLocaleString(), margin, 60);
        y = 68;

        const c = reportData.businesses || {};
        const inspectionDate = reportData.inspection_date ? new Date(reportData.inspection_date) : new Date();
        const dateStr = inspectionDate.toLocaleString();
        
        // Fix: Use reportData.id for verification if code is missing
        const verificationCode = reportData.verification_code || (reportData.id ? reportData.id.split('-')[0].toUpperCase() : 'NOT_ISSUED');
        const verificationUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/verify/${encodeURIComponent(reportData.id || verificationCode)}`
            : `verify/${reportData.id || verificationCode}`;

        sectionBar('CLIENT INFORMATION');
        row('Business:', c.business_name, pageW / 2, 'Permit No:', c.permit_no);
        const location = [c.building_name, c.street_name, c.ward_name, c.subcounty_name].filter(Boolean).join(', ') || '—';
        row('Location:', location, pageW / 2, 'Tracking ID:', reportData.id ? reportData.id.split('-')[0] : '—');
        row('Contact Person:', getBusinessContactName(c), pageW / 2, 'Phone:', getBusinessPhone(c));
        row('Email:', getBusinessEmail(c));
        y += 2;

        sectionBar('INSPECTION DETAILS');
        if (senderInfo?.company_name || senderInfo?.company_email) {
            row('Service Co.:', senderInfo.company_name || '—', pageW / 2, 'Co. Email:', senderInfo.company_email || '—');
        }
        row('Date & Time:', dateStr, pageW / 2, 'Lead PHO:', reportData.inspector_name);
        row('Personnel:', (reportData.personnel || []).join(', ') || 'Lead only');
        row('Service Type:', reportData.service_type || '—', pageW / 2, 'Total Fee:', `KES ${Number(reportData.calculated_fee || 0).toLocaleString()}`);
        
        if (reportData.next_inspection_date) {
            checkPage(7);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GREEN);
            doc.text('NEXT SCHEDULED INSPECTION:', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...DARK);
            const nextDate = new Date(reportData.next_inspection_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.text(nextDate, margin + 48, y);
            y += 8;
        }
        
        // Fee Split Box
        checkPage(20);
        doc.setFillColor(248, 250, 252); // Very light gray
        doc.roundedRect(margin, y, usableW, 14, 1, 1, 'F');
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.1);
        doc.roundedRect(margin, y, usableW, 14, 1, 1, 'S');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY);
        doc.text('STATUTORY REVENUE SPLIT (PER FINANCE ACT 2023)', margin + 4, y + 5);
        
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const govtShare = Number(reportData.ipm_nccg) || Number(reportData.calculated_fee || 0) * 0.25;
        const vendorShare = Number(reportData.ipm_vendor) || Number(reportData.calculated_fee || 0) * 0.75;
        doc.text(`Government Share (25%): KES ${govtShare.toLocaleString()}`, margin + 4, y + 10);
        doc.text(`Vendor Share (75%): KES ${vendorShare.toLocaleString()}`, margin + usableW / 2 + 4, y + 10);
        
        y += 18;

        sectionBar('AREAS & PEST TYPES');
        row('Areas Affect.:', (reportData.areas_affected || []).join(', ') || '—');
        row('Pests Targeted:', (reportData.pest_types || []).join(', ') || '—');
        y += 2;

        sectionBar('CHEMICALS & METHODS');
        if (reportData.chemical_dosages?.length > 0) {
            checkPage(15);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...GRAY);
            doc.text('CHEMICAL NAME', margin, y);
            doc.text('DOSAGE / DILUTION', margin + usableW / 2, y);
            y += 4;
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, y, margin + usableW, y);
            y += 5;
            
            reportData.chemical_dosages.forEach(d => {
                checkPage(6);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...DARK);
                doc.text(String(d.chemical), margin, y);
                doc.setFont('helvetica', 'italic');
                doc.text(String(d.dosage || '—'), margin + usableW / 2, y);
                y += 5.5;
            });
            y += 4;
        } else {
            bullets(reportData.chemicals_used);
        }
        row('Treat. Methods:', (reportData.treatment_methods || []).join(', ') || '—');
        y += 2;

        sectionBar('SANITATION ASSESSMENT');
        row('Housekeeping:', reportData.housekeeping_rating || '—', pageW / 2, 'Waste Mgmt:', reportData.waste_management_rating || '—');
        row('Stacking:', reportData.stacking_rating || '—', pageW / 2, 'Overall Sanit.:', reportData.overall_sanitation_rating || '—');
        
        if (reportData.pest_sightings) {
            const sightings = [];
            const ps = reportData.pest_sightings;
            if (ps.rodents) sightings.push("Rodents");
            if (ps.bedbugs) sightings.push(`Bedbugs (Count: ${ps.bedbug_count || 'Unspecified'})`);
            if (ps.other) sightings.push(ps.other_description || "Other Pests");
            
            if (sightings.length > 0) {
                row('Sightings Det:', sightings.join(', '));
            }
        }
        y += 2;

        if (reportData.issues_found?.length > 0) {
            sectionBar('OBSERVED ISSUES');
            bullets(reportData.issues_found);
            y += 2;
        }

        sectionBar('RECOMMENDATIONS');
        bullets(reportData.recommendations);
        y += 2;

        if (reportData.notes && reportData.notes.trim()) {
            sectionBar('ADDITIONAL NOTES');
            const lines = doc.splitTextToSize(reportData.notes, usableW - 4);
            lines.forEach(line => {
                checkPage(6);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...DARK);
                doc.text(line, margin, y);
                y += 5.5;
            });
            y += 2;
        }

        sectionBar('AUTHENTICITY VERIFICATION');
        row('Verification Code:', verificationCode, pageW / 2, 'Payment Ref:', reportData.payment_ref);
        row('Fingerprint:', reportData.verification_fingerprint || '—', pageW / 2, 'Fee Category:', reportData.fee_category);
        row('Revenue Premise:', reportData.fee_premise || 'General Audit');

        if (reportData.photo_meta?.length > 0) {
            sectionBar('EVIDENCE PORTFOLIO');
            const imgSize = (usableW - 10) / 2;
            let count = 0;
            
            for (const p of reportData.photo_meta) {
                if (!p.url) continue;
                try {
                    checkPage(imgSize + 25);
                    const imgData = await fetchImageAsDataUrl(p.url);
                    
                    const col = count % 2;
                    const xPos = margin + (col * (imgSize + 10));
                    
                    doc.addImage(imgData, 'JPEG', xPos, y, imgSize, imgSize);
                    
                    doc.setFontSize(7);
                    doc.setTextColor(...GRAY);
                    doc.setFont('helvetica', 'italic');
                    const caption = p.caption || (p.issue ? `Issue: ${p.issue}` : 'Attached Evidence');
                    const capLines = doc.splitTextToSize(caption, imgSize);
                    doc.text(capLines, xPos, y + imgSize + 4);
                    
                    if (col === 1) {
                        y += imgSize + 15;
                    }
                    count++;
                } catch (e) {
                    console.warn("Failed to add image to PDF", e);
                }
            }
            if (count % 2 !== 0) y += imgSize + 15;
            y += 5;
        }

        checkPage(8);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY);
        doc.text('Verify Online:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        const verifyLines = doc.splitTextToSize(verificationUrl, usableW - 35);
        doc.text(verifyLines, margin + 32, y);
        y += verifyLines.length * 5.5;

        checkPage(8);
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        doc.text(
            'This document is valid only when the verification code is confirmed on the official NCCG verification portal.',
            margin,
            y
        );

        const datePart = inspectionDate.toISOString().slice(0, 10);
        doc.save(`NCCG_Audit_${c.business_name || 'Report'}_${datePart}.pdf`);
    } catch (error) {
        logError(error, {
            source: 'pdf.generateInspectionPDF',
            metadata: {
                reportId: reportData?.id || null,
                businessId: reportData?.business_id || reportData?.businesses?.id || null,
            },
        });
        alert('Failed to generate PDF: ' + error.message);
    }
}
