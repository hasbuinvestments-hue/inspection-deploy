from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from inspections.models import (
    Business, Inspection, ReportVerificationLog, SystemActivityLog, 
    ClientErrorLog, BusinessApplication, SystemSetting
)
from inspections.serializers import (
    BusinessSerializer, InspectionSerializer, ReportVerificationLogSerializer, 
    SystemActivityLogSerializer, ClientErrorLogSerializer, BusinessApplicationSerializer,
    SystemSettingSerializer
)

class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['business_name', 'permit_no', 'subcounty_name', 'ward_name']

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        # Admins and Super Admins see everything (Registry is universal)
        if user.role in ('super_admin', 'admin', 'finance_manager'):
            return Business.objects.all()
            
        params = self.request.query_params
        applied_by_me = params.get('applied_by_me') == 'true'
        registered_by_me = params.get('registered_by_me') == 'true'

        if user.role in ('pho', 'nccg_inspector'):
            subcounty = (user.subcounty or '').strip()

            # Only show businesses this PHO personally field-registered
            if registered_by_me:
                return Business.objects.filter(created_by=user).order_by('-created_at')

            # PHOs see their zone + what they personally registered
            query = Q(subcounty_name__iexact=subcounty) | Q(created_by=user)

            if applied_by_me and user.role == 'pho':
                applied_ids = BusinessApplication.objects.filter(
                    inspector=user, status='active'
                ).values_list('business_id', flat=True)
                return Business.objects.filter(Q(id__in=applied_ids) | Q(created_by=user))

            if not subcounty:
                return Business.objects.filter(created_by=user)

            return Business.objects.filter(query)

        return Business.objects.none()
 
    def perform_create(self, serializer):
        user = self.request.user
        # Automatically tag as field registration if PHO creates it
        is_new = user.role == 'pho'
        instance = serializer.save(
            created_by=user, 
            is_new_registration=is_new,
            subcounty_name=user.subcounty or serializer.validated_data.get('subcounty_name')
        )
        
        if is_new:
            from .utils import log_activity
            log_activity(user, 'FIELD_CLIENT_REGISTERED', {
                'business_id': str(instance.id),
                'business_name': instance.business_name
            })

    @action(detail=False, methods=['GET'], permission_classes=[permissions.IsAuthenticated], url_path='debug-subcounties')
    def debug_subcounties(self, request):
        """Returns distinct subcounty_name values stored in Business table. Admin only."""
        if request.user.role not in ('super_admin', 'admin'):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        values = list(
            Business.objects.exclude(subcounty_name__isnull=True)
            .exclude(subcounty_name='')
            .values_list('subcounty_name', flat=True)
            .distinct()
            .order_by('subcounty_name')
        )
        return Response({'stored_subcounties': values, 'count': len(values)})

import django_filters
from django.db.models import Q

class InspectionFilter(django_filters.FilterSet):
    is_alert = django_filters.BooleanFilter(method='filter_is_alert')
    is_action_required = django_filters.BooleanFilter(method='filter_is_action_required')
    inspection_date = django_filters.DateFromToRangeFilter()
    inspection_date__date = django_filters.DateFilter(field_name='inspection_date', lookup_expr='date')

    class Meta:
        model = Inspection
        fields = {
            'is_paid': ['exact'],
            'payment_status': ['exact', 'in'],
            'payment_method': ['exact', 'in'],
            'approval_status': ['exact', 'in'],
            'status': ['exact', 'in'],
            'inspector': ['exact', 'in'],
            'is_draft': ['exact'],
            'inspection_date': ['exact', 'date', 'gte', 'lte'],
            'updated_at': ['exact', 'date', 'gte', 'lte'],
            'business__subcounty_name': ['exact', 'in', 'icontains'],
            'business__business_name': ['icontains'],
        }

    def filter_is_alert(self, queryset, name, value):
        if value:
            return queryset.filter(Q(payment_status='flagged') | Q(approval_status='pending'))
        return queryset

    def filter_is_action_required(self, queryset, name, value):
        if value:
            return queryset.filter(Q(payment_status='flagged') | Q(approval_status='declined'))
        return queryset

class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer
    filterset_class = InspectionFilter
    search_fields = ['payment_ref', 'business__business_name']
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return Inspection.objects.all()
        if user.role == 'admin':
            from django.db.models import Q
            return Inspection.objects.filter(Q(inspector__created_by=user) | Q(inspector=user))
        if user.role == 'nccg_inspector':
            # Lock to own subcounty
            if user.subcounty:
                return Inspection.objects.filter(business__subcounty_name=user.subcounty)
            return Inspection.objects.none()
        if user.role == 'pho':
            # PHOs see their own inspections only (subcounty enforced at business lookup level)
            return Inspection.objects.filter(inspector=user)
        if user.role == 'finance_manager':
            # Finance managers see their company's inspections (linked via Admin they work for)
            from django.db.models import Q
            # If they have a creator, they see that creator's team's data
            if user.created_by:
                return Inspection.objects.filter(Q(inspector__created_by=user.created_by) | Q(inspector=user.created_by))
            return Inspection.objects.all() # Fallback for system-wide finance
        return Inspection.objects.filter(inspector=user)

    def perform_create(self, serializer):
        from .utils import log_activity
        user = self.request.user
        # Capture the inspector's name at the time of creation for historical accuracy
        name = user.full_name or user.username
        instance = serializer.save(inspector=user, inspector_name=name)
        
        log_activity(user, 'INSPECTION_CREATED', {
            'inspection_id': str(instance.id),
            'business_name': instance.business.business_name if instance.business else "Unknown",
            'is_draft': instance.is_draft
        })

    def partial_update(self, request, *args, **kwargs):
        from .utils import log_activity
        instance = self.get_object()
        old_status = instance.approval_status
        old_pay_status = instance.payment_status
        
        response = super().partial_update(request, *args, **kwargs)
        
        new_status = response.data.get('approval_status', old_status)
        new_pay_status = response.data.get('payment_status', old_pay_status)
        
        if old_status != new_status or old_pay_status != new_pay_status:
            log_activity(request.user, 'INSPECTION_STATUS_CHANGE', {
                'inspection_id': str(instance.id),
                'business_name': instance.business.business_name if instance.business else "Unknown Business",
                'old_approval': old_status,
                'new_approval': new_status,
                'old_payment': old_pay_status,
                'new_payment': new_pay_status
            })
            
        return response

    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny], url_path='subcounties')
    def list_subcounties(self, request):
        subcounties = list(
            Business.objects.exclude(subcounty_name__isnull=True)
            .exclude(subcounty_name='')
            .values_list('subcounty_name', flat=True)
            .distinct()
            .order_by('subcounty_name')
        )
        return Response(subcounties)

    @action(detail=False, methods=['POST'], permission_classes=[permissions.IsAuthenticated], url_path='dispatch-email')
    def dispatch_email(self, request):
        """
        Tiered Email Dispatcher:
        1. Gmail SMTP (via App Password)
        2. Custom Domain (via Resend)
        3. Fallback (via Resend + Reply-To)
        """
        user = request.user
        to_email = request.data.get('to')
        subject = request.data.get('subject', 'Inspection Update')
        html_content = request.data.get('html')
        variables = request.data.get('variables', {})

        if not to_email:
            return Response({'error': 'Recipient email (to) is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Determine Company Identity & Method
        import os
        system_email = os.getenv('NOREPLY_EMAIL', 'noreply@nccg.go.ke')
        sender_name = "NCCG Inspections"
        reply_to_email = system_email
        send_method = 'fallback'
        config = {}

        # Look up the regional admin (the person who created the PHO)
        admin = user.created_by if user.role != 'admin' else user
        if admin:
            sender_name = admin.company_name or sender_name
            reply_to_email = admin.company_email or reply_to_email
            send_method = getattr(admin, 'email_send_method', 'fallback')
            config = {
                'gmail_password': admin.company_gmail_password,
                'sending_domain': admin.custom_sending_domain,
                'company_email': admin.company_email
            }

        if not html_content:
            # Basic fallback template
            html_content = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                <h1 style="color: #1e293b;">{sender_name}</h1>
                <p>Hello,</p>
                <p>Please find the requested document regarding <b>{variables.get('business_name', 'your inspection')}</b>.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">
                    Sent on behalf of {sender_name}.
                    Replies will be sent to {reply_to_email}.
                </p>
            </div>
            """

        # 2. Dispatch Logic
        import os, json, urllib.request, smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        # CASE A: Gmail SMTP
        if send_method == 'gmail' and config.get('gmail_password') and config.get('company_email'):
            try:
                msg = MIMEMultipart()
                msg['From'] = f"{sender_name} <{config['company_email']}>"
                msg['To'] = to_email
                msg['Subject'] = subject
                msg.attach(MIMEText(html_content, 'html'))

                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(config['company_email'], config['gmail_password'])
                server.send_message(msg)
                server.quit()
                return Response({'message': 'Dispatched via Gmail SMTP', 'method': 'gmail'})
            except Exception as e:
                return Response({'error': f"Gmail SMTP Failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # CASE B: Resend (Custom Domain or Fallback)
        api_key = os.getenv('RESEND_API_KEY')
        if not api_key:
            print(f"[Email Simulation] To: {to_email} | Method: {send_method} | From: {sender_name}")
            return Response({'message': 'Simulation: Email dispatched', 'simulated': True})

        if send_method == 'custom_domain' and config.get('sending_domain'):
            from_address = f"{sender_name} <noreply@{config['sending_domain']}>"
        else:
            from_address = f"{sender_name} <{system_email}>"

        try:
            req = urllib.request.Request(
                'https://api.resend.com/emails',
                method='POST',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}'
                },
                data=json.dumps({
                    'from': from_address,
                    'to': [to_email],
                    'reply_to': reply_to_email,
                    'subject': subject,
                    'html': html_content
                }).encode('utf-8')
            )
            
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                return Response({**res_data, 'method': send_method, 'from': from_address})
        except Exception as e:
            return Response({'error': f"Resend Failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['GET'], permission_classes=[permissions.AllowAny], url_path='verify/(?P<report_id>[^/.]+)')
    def verify_report_public(self, request, report_id=None):
        from django.db.models import Q
        try:
            # Flexible lookup: UUID or Public Code
            inspection = Inspection.objects.filter(
                Q(id__contains=report_id) | Q(verification_code=report_id)
            ).first()
            
            if not inspection:
                raise Inspection.DoesNotExist()

            # Log the request
            ReportVerificationLog.objects.create(
                report_id=inspection.id,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
            data = InspectionSerializer(inspection).data
            
            # Flatten some fields for the verification UI
            if inspection.business:
                data['businesses'] = BusinessSerializer(inspection.business).data
                data['permit_no'] = inspection.business.permit_no
            
            data['fingerprint'] = inspection.verification_fingerprint
            data['issued_at'] = inspection.issued_at or inspection.created_at
            
            return Response(data)
        except Inspection.DoesNotExist:
            return Response({'error': 'Inspection not found'}, status=status.HTTP_404_NOT_FOUND)

class ReportVerificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportVerificationLog.objects.all()
    serializer_class = ReportVerificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

class SystemActivityLogViewSet(viewsets.ModelViewSet):
    queryset = SystemActivityLog.objects.all().order_by('-created_at')
    serializer_class = SystemActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Optimization: Batch fetch related user names for the current page
        # This prevents 100+ separate queries per page load
        logs = self.get_queryset()
        # Use pagination bounds if available
        try:
            page = self.paginate_queryset(logs)
            target_logs = page if page is not None else logs
        except:
            target_logs = logs

        uids = {log.user_id for log in target_logs if log.user_id}
        if uids:
            from users.models import User
            users_map = {
                str(u.id): u.full_name or u.username 
                for u in User.objects.filter(id__in=uids)
            }
            context['user_names'] = users_map
        return context

class ClientErrorLogViewSet(viewsets.ModelViewSet):
    queryset = ClientErrorLog.objects.all()
    serializer_class = ClientErrorLogSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class BusinessApplicationViewSet(viewsets.ModelViewSet):
    queryset = BusinessApplication.objects.all()
    serializer_class = BusinessApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'super_admin':
            return BusinessApplication.objects.all()
        if user.role == 'admin':
            return BusinessApplication.objects.filter(inspector__created_by=user)
        return BusinessApplication.objects.filter(inspector=user)

    def perform_create(self, serializer):
        from .utils import log_activity
        business = serializer.validated_data.get('business')
        user = self.request.user
        
        # 1. Check if CURRENT user already has an active application (Integrity Check)
        if BusinessApplication.objects.filter(business=business, inspector=user, status='active').exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'business': 'You already have an active application for this business.'})

        # 2. Check if ANY OTHER officer has an active application (Global Lock)
        exists = BusinessApplication.objects.filter(
            business=business, 
            status='active'
        ).exclude(inspector=user).exists()
        
        if exists:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'business': 'This business is already locked by another officer for an active audit.'})
            
        instance = serializer.save(inspector=user)
        
        log_activity(user, 'BUSINESS_APPLICATION_CREATED', {
            'application_id': str(instance.id),
            'business_name': instance.business.business_name
        })

    def perform_update(self, serializer):
        user = self.request.user
        # Only allow re-assignment by Admins/Superadmins
        if 'inspector' in self.request.data and user.role not in ('admin', 'super_admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can re-assign applications to other officers.")
        
        serializer.save()

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Allows access only to global Admins and Super Admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                   request.user.role in ('super_admin', 'admin'))

class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    lookup_field = 'key'

    def get_permissions(self):
        # Only Admins/Superadmins can update global system settings (like fees)
        if self.action in ['update', 'partial_update', 'create', 'destroy']:
            return [IsAdminOrSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def _log_setting_change(self, request, instance, old_value):
        from .utils import log_activity
        log_activity(request.user, 'SETTING_CHANGED', {
            'key': instance.key,
            'label': instance.label or instance.key,
            'old_value': old_value,
            'new_value': instance.value,
        })

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = instance.value
        response = super().update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.value != old_value:
            self._log_setting_change(request, instance, old_value)
        return response

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_value = instance.value
        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()
        if instance.value != old_value:
            self._log_setting_change(request, instance, old_value)
        return response
