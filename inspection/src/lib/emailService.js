import { apiFetch } from './api';
import { logError } from './logger';
import { getBusinessEmail } from './reportContacts';

/**
 * Sends a real email via the backend dispatcher.
 * The backend handles corporate branding (Company Name/Email lookup).
 */
async function dispatchEmail({ to, subject, html, variables, template_id }) {
  try {
    const result = await apiFetch('/inspections/dispatch-email/', {
      method: 'POST',
      body: JSON.stringify({
        to,
        subject,
        html,
        variables,
        template_id
      })
    });

    return result;
  } catch (err) {
    console.error("[EmailService] Dispatch failed:", err);
    throw err;
  }
}

/**
 * Sends an invoice to a client.
 */
export async function sendClientInvoice(reportData) {
  try {
    const business = reportData.businesses;
    const email = getBusinessEmail(business);
    
    if (!email || email === '—') {
      console.warn("No valid email found for business, skipping invoice dispatch.");
      return { success: false, reason: 'No email' };
    }

    // 1. Log the attempt
    await apiFetch('/inspections/activity-logs/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'EMAIL_DISPATCHED',
        details: { 
          recipient: email, 
          type: 'INVOICE', 
          status: 'success',
          inspection_id: reportData.id
        }
      })
    });

    // 2. Dispatch
    const result = await apiFetch('/inspections/dispatch-email/', {
      method: 'POST',
      body: JSON.stringify({
        to: email,
        subject: `Invoice for Inspection - ${business.business_name}`,
        template_id: 'INVOICE',
        variables: { ...reportData, business_name: business.business_name }
      })
    });

    return { success: true, recipient: email, resend_id: result.id };

  } catch (err) {
    logError(err, { source: 'emailService', inspectionId: reportData?.id });
    return { success: false, error: err.message };
  }
}

export async function sendClientReport(reportData) {
  try {
    const business = reportData.businesses;
    const email = getBusinessEmail(business);
    
    if (!email || email === '—') return { success: false, reason: 'No email' };

    // 1. Log the attempt
    await apiFetch('/inspections/activity-logs/', {
      method: 'POST',
      body: JSON.stringify({
        action: 'EMAIL_DISPATCHED',
        details: { 
          recipient: email, 
          type: 'REPORT', 
          status: 'success',
          inspection_id: reportData.id
        }
      })
    });

    // 2. Dispatch
    const result = await apiFetch('/inspections/dispatch-email/', {
      method: 'POST',
      body: JSON.stringify({
        to: email,
        subject: `Inspection Report: ${business.business_name}`,
        template_id: 'REPORT',
        variables: { ...reportData, business_name: business.business_name }
      })
    });

    return { success: true, recipient: email, resend_id: result.id };

  } catch (err) {
    logError(err, { source: 'emailService', inspectionId: reportData?.id });
    return { success: false, error: err.message };
  }
}
