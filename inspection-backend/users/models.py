from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('pho', 'Public Health Officer'),
        ('finance_manager', 'Finance Manager'),
        ('nccg_inspector', 'NCCG Inspector'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='pho')
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_staff')
    assigned_nccg = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_phos')
    subcounty = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=50, default='active')
    last_login_at = models.DateTimeField(blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    company_email = models.EmailField(blank=True, null=True)

    # Email Sending Settings
    email_send_method = models.CharField(max_length=20, default='fallback')
    company_gmail_password = models.CharField(max_length=255, blank=True, null=True)
    custom_sending_domain = models.CharField(max_length=255, blank=True, null=True)
    domain_verified = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.full_name or self.email} ({self.role})"


class InviteToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=30)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    used = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invite for {self.role} ({self.id})"
