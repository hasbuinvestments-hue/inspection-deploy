import { apiFetch } from './api';
import { logError } from './logger';
import { getBusinessEmail } from './reportContacts';

async function dispatchEmail({ to, subject, html, variables, template_id, reply_to }) {
  try {
    const result = await apiFetch('/inspections/dispatch-email/', {
      method: 'POST',
      body: JSON.stringify({
        to,
        subject,
        html,
        variables,
        template_id,
        // reply_to routes client replies to the admin's company email
        ...(reply_to ? { reply_to } : {})
      })
    });

    return result;
  } catch (err) {
    console.error("[EmailService] Dispatch failed:", err);
    throw err;
  }
}

/**
 * @param {object} reportData - inspection record
 * @param {string} [companyEmail] - admin's company_email from profile; used as Reply-To
 */
export async function sendClientInvoice(reportData, companyEmail) {
  try {
    const business = reportData.businesses;
    const email = getBusinessEmail(business);

    if (!email || email === '—') {
      console.warn("No valid email found for business, skipping invoice dispatch.");
      return { success: false, reason: 'No email' };
    }

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

    const result = await dispatchEmail({
      to: email,
      subject: `Invoice for Inspection - ${business.business_name}`,
      template_id: 'INVOICE',
      variables: { ...reportData, business_name: business.business_name },
      reply_to: companyEmail || null
    });

    return { success: true, recipient: email, resend_id: result?.id };

  } catch (err) {
    logError(err, { source: 'emailService', inspectionId: reportData?.id });
    return { success: false, error: err.message };
  }
}

/**
 * @param {object} reportData - inspection record
 * @param {string} [companyEmail] - admin's company_email from profile; used as Reply-To
 */
export async function sendClientReport(reportData, companyEmail) {
  try {
    const business = reportData.businesses;
    const email = getBusinessEmail(business);

    if (!email || email === '—') return { success: false, reason: 'No email' };

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

    const result = await dispatchEmail({
      to: email,
      subject: `Inspection Report: ${business.business_name}`,
      template_id: 'REPORT',
      variables: { ...reportData, business_name: business.business_name },
      reply_to: companyEmail || null
    });

    return { success: true, recipient: email, resend_id: result?.id };

  } catch (err) {
    logError(err, { source: 'emailService', inspectionId: reportData?.id });
    return { success: false, error: err.message };
  }
}
