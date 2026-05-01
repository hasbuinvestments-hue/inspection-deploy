from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from users.models import User, InviteToken
from users.serializers import UserSerializer, RegisterSerializer, InviteTokenSerializer
from django.shortcuts import get_object_or_404
from inspections.utils import log_activity
from rest_framework.permissions import AllowAny
import uuid

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['role', 'subcounty', 'status', 'assigned_nccg']

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q

        if user.role == 'super_admin':
            qs = User.objects.all().order_by('-date_joined')
        elif user.role == 'admin':
            qs = User.objects.filter(Q(created_by=user) | Q(id=user.id)).order_by('-date_joined')
        elif user.role == 'nccg_inspector':
            # Allow NCCG inspectors to see PHOs assigned to them (needed for filter dropdowns)
            qs = User.objects.filter(Q(assigned_nccg=user) | Q(id=user.id)).order_by('-date_joined')
        elif user.role == 'finance_manager':
            # Finance managers see all staff under the same regional admin (created_by)
            if user.created_by:
                qs = User.objects.filter(Q(created_by=user.created_by) | Q(id=user.created_by_id)).order_by('-date_joined')
            else:
                qs = User.objects.all().order_by('-date_joined')
        else:
            qs = User.objects.filter(id=user.id)

        # Support role__in=pho,admin,...
        role_in = self.request.query_params.get('role__in')
        if role_in:
            qs = qs.filter(role__in=[r.strip() for r in role_in.split(',')])

        return qs

    def perform_update(self, serializer):
        # Prevent self-suspension or self-activation
        if 'status' in self.request.data and serializer.instance == self.request.user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'status': 'You cannot suspend or activate your own account.'})
        serializer.save()

    @action(detail=False, methods=['post'], url_path='invites')
    def create_invite(self, request):
        """Called when Superadmin clicks 'Generate Invite Link'"""
        if request.user.role != 'super_admin':
            return Response({'error': 'Only Superadmins can generate invites.'}, status=403)
        
        role = request.data.get('role', 'admin')
        invite = InviteToken.objects.create(
            created_by=request.user,
            role=role,
            id=uuid.uuid4()
        )
        return Response({'id': str(invite.id)})

    @action(detail=False, methods=['post'], url_path='register-invite', permission_classes=[AllowAny])
    def register_invite(self, request):
        """Called when a new company admin completes the self-registration form"""
        token_str = request.data.get('token')
        try:
            invite = InviteToken.objects.get(id=token_str, used=False)
        except (InviteToken.DoesNotExist, ValueError):
            return Response({'error': 'Invalid or expired invite link.'}, status=400)

        serializer = RegisterSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Force the role and created_by from the invite
            user = serializer.save(
                role=invite.role,
                created_by=invite.created_by
            )
            invite.used = True
            invite.save()
            
            log_activity(invite.created_by, 'STAFF_REGISTERED_VIA_INVITE', {
                'target_user': str(user.id),
                'invite_id': str(invite.id)
            })
            return Response({'message': 'Registration successful.', 'user': UserSerializer(user).data})
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['post'], url_path='test-email-config', permission_classes=[AllowAny])
    def test_email_config(self, request):
        """Called when a new admin clicks 'Test Connection' before finishing registration"""
        method = request.data.get('email_send_method', 'fallback')
        company_email = request.data.get('company_email')
        company_name = request.data.get('company_name', 'Test Company')
        gmail_password = request.data.get('company_gmail_password')
        sending_domain = request.data.get('custom_sending_domain')

        if not company_email:
            return Response({'error': 'Company email is required for testing'}, status=400)

        try:
            if method == 'gmail':
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart
                
                msg = MIMEMultipart()
                msg['From'] = f"{company_name} <{company_email}>"
                msg['To'] = company_email
                msg['Subject'] = "Connection Test: Gmail SMTP"
                msg.attach(MIMEText("<h1>Success!</h1><p>Your Gmail SMTP configuration is working correctly.</p>", 'html'))

                with smtplib.SMTP('smtp.gmail.com', 587) as server:
                    server.starttls()
                    server.login(company_email, gmail_password)
                    server.send_message(msg)
                return Response({'message': f'Gmail connection verified for {company_email}. Check your inbox.'})

            elif method == 'custom_domain':
                import os, json, urllib.request
                api_key = os.getenv('RESEND_API_KEY')
                if api_key and sending_domain:
                    try:
                        req = urllib.request.Request(
                            'https://api.resend.com/emails',
                            method='POST',
                            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
                            data=json.dumps({
                                'from': f"{company_name} <noreply@{sending_domain}>",
                                'to': [company_email],
                                'subject': "Connection Test: Custom Domain",
                                'html': "<h1>Success!</h1>Domain connection verified."
                            }).encode('utf-8')
                        )
                        with urllib.request.urlopen(req) as response:
                            pass
                    except:
                        pass
                return Response({'message': f'Domain {sending_domain} noted. DNS records will be generated after registration.'})

            else:
                return Response({'message': 'County default (Reply-To) requires no configuration.'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_create_user(request):
    """Replaces the Supabase RPC admin_create_user"""
    if request.user.role not in ['super_admin', 'admin']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    serializer = RegisterSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        log_activity(request.user, 'STAFF_REGISTERED', {
            'target_user': str(user.id),
            'target_email': user.email,
            'role': user.role
        })
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_purge_user(request):
    """Delete a user account. Super Admin only."""
    if request.user.role not in ['super_admin']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    user = get_object_or_404(User, id=user_id)
    target_info = {'id': str(user.id), 'email': user.email, 'role': user.role}
    user.delete()
    log_activity(request.user, 'STAFF_PURGED', target_info)
    return Response({'message': 'User purged successfully'})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def transfer_subcounty(request):
    """Transfer a PHO or NCCG inspector to a different subcounty."""
    if request.user.role not in ['super_admin', 'admin']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    new_subcounty = request.data.get('subcounty')

    if not user_id or not new_subcounty:
        return Response({'error': 'user_id and subcounty are required'}, status=status.HTTP_400_BAD_REQUEST)

    target = get_object_or_404(User, id=user_id)
    if target.role not in ['pho', 'nccg_inspector']:
        return Response({'error': 'Only PHO and NCCG inspectors can be transferred'}, status=status.HTTP_400_BAD_REQUEST)

    if request.user.role == 'admin' and target.created_by != request.user:
        return Response({'error': 'You can only transfer your own staff'}, status=status.HTTP_403_FORBIDDEN)

    old_subcounty = target.subcounty
    target.subcounty = new_subcounty
    target.save(update_fields=['subcounty'])

    log_activity(request.user, 'STAFF_TRANSFERRED', {
        'target_user': str(target.id),
        'old_subcounty': old_subcounty,
        'new_subcounty': new_subcounty
    })
    return Response({'message': 'Transfer successful', 'user_id': str(target.id)})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def admin_reset_password(request):
    """Allow Admin to reset a staff member's password."""
    if request.user.role not in ['super_admin', 'admin']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    new_password = request.data.get('password')

    if not user_id or not new_password:
        return Response({'error': 'user_id and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    target = get_object_or_404(User, id=user_id)
    if request.user.role == 'admin' and target.created_by != request.user:
        return Response({'error': 'You can only reset passwords for your own staff'}, status=status.HTTP_403_FORBIDDEN)

    target.set_password(new_password)
    target.save()

    log_activity(request.user, 'STAFF_PASSWORD_RESET', {
        'target_user': str(target.id),
        'target_email': target.email
    })
    return Response({'message': f'Password for {target.email} has been reset successfully'})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def resolve_staff_login_email(request):
    identifier = (request.data.get('email') or '').strip()
    from django.db.models import Q
    user = User.objects.filter(Q(email__iexact=identifier) | Q(department__iexact=identifier)).first()
    if user: return Response({'email': user.email})
    return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
