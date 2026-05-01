import requests
import os
import logging
from .utils import log_activity

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_registration_alert(business):
        """
        Sends a notification when a new business is registered in the field.
        """
        owner_name = business.owner_name or "Client"
        business_name = business.business_name
        phone = business.owner_phone
        email = business.owner_email
        ubp = business.permit_no or "PENDING"
        
        message = f"Hello {owner_name}, your business '{business_name}' (UBP: {ubp}) has been successfully registered in the Nairobi Inspection Registry. You will receive digital audit reports on this number/email."
        
        # 1. Email via Resend
        if email:
            NotificationService._send_email(email, f"Registration: {business_name}", message)
            
        # 2. WhatsApp/SMS via Twilio
        if phone:
            NotificationService._send_sms_whatsapp(phone, message)
            
        log_activity(None, 'NOTIFICATION_SENT', {
            'type': 'registration',
            'business_id': str(business.id),
            'business_name': business_name,
            'ubp': ubp,
            'recipient_phone': phone
        })

    @staticmethod
    def send_audit_completion_alert(inspection):
        """
        Sends a notification when an inspection/audit is completed.
        """
        business = inspection.business
        owner_name = business.owner_name or "Client"
        phone = business.owner_phone
        email = business.owner_email
        ubp = business.permit_no or "PENDING"
        
        message = f"Hello {owner_name}, an inspection for '{business.business_name}' (UBP: {ubp}) was completed by Inspector {inspection.inspector_name}. Status: {inspection.approval_status.upper()}. Fee: KES {inspection.calculated_fee}."
        
        if email:
            NotificationService._send_email(email, f"Inspection Audit: {business.business_name}", message)
            
        if phone:
            NotificationService._send_sms_whatsapp(phone, message)

        log_activity(None, 'NOTIFICATION_SENT', {
            'type': 'audit_completion',
            'inspection_id': str(inspection.id),
            'business_name': business.business_name,
            'ubp': ubp,
            'recipient_phone': phone
        })

    @staticmethod
    def _send_email(to_email, subject, content):
        api_key = os.getenv('RESEND_API_KEY')
        if not api_key:
            logger.warning("RESEND_API_KEY not found. Skipping email notification.")
            return

        try:
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"Nairobi Inspection <{os.getenv('NOREPLY_EMAIL', 'noreply@nccg.go.ke')}>",
                    "to": to_email,
                    "subject": subject,
                    "html": f"<p>{content}</p>"
                }
            )
            if res.status_code != 200:
                logger.error(f"Resend Error: {res.text}")
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")

    @staticmethod
    def _send_sms_whatsapp(phone, message):
        # 1. Log for auditing
        logger.info(f"NOTIFICATION_TRIGGERED to {phone}: {message}")
        
        # 2. Twilio Integration (SMS & WhatsApp)
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_FROM_NUMBER') # e.g., '+1234567890' or 'whatsapp:+1234567890'
        
        if not all([account_sid, auth_token, from_number]):
            logger.warning("Twilio credentials missing. Logging only.")
            return

        try:
            # Determine if we should send WhatsApp or SMS
            # If the from_number starts with 'whatsapp:', send WhatsApp
            is_whatsapp = from_number.startswith('whatsapp:')
            target_phone = f"whatsapp:{phone}" if is_whatsapp and not phone.startswith('whatsapp:') else phone

            res = requests.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                auth=(account_sid, auth_token),
                data={
                    'To': target_phone,
                    'From': from_number,
                    'Body': message
                }
            )
            if res.status_code not in (200, 201):
                logger.error(f"Twilio Error: {res.text}")
        except Exception as e:
            logger.error(f"Failed to send Twilio message: {str(e)}")
