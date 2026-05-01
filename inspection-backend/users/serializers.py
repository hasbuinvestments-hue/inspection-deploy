from rest_framework import serializers
from users.models import User, InviteToken

class UserSerializer(serializers.ModelSerializer):
    works_for = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'department', 'subcounty', 
            'assigned_nccg', 'full_name', 'avatar_url', 'status', 
            'last_login_at', 'date_joined', 'created_by', 'works_for',
            'company_name', 'company_email', 'email_send_method', 
            'custom_sending_domain', 'domain_verified'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login_at', 'created_by', 'works_for']

    def get_works_for(self, obj):
        if obj.role == 'admin':
            return None
        # If it's a PHO or Finance Mgr, show their company/admin's name
        if obj.created_by and obj.created_by.role == 'admin':
            return obj.created_by.company_name or obj.created_by.full_name
        return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = [
            'email', 'password', 'full_name', 'role', 'department', 
            'subcounty', 'assigned_nccg', 'company_name', 'company_email',
            'company_gmail_password', 'custom_sending_domain', 'email_send_method'
        ]

    def create(self, validated_data):
        email = validated_data['email']
        username = email  # use email as username
        request = self.context.get('request')
        created_by = request.user if request and request.user.is_authenticated else None

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            full_name=validated_data.get('full_name', ''),
            role=validated_data.get('role', 'pho'),
            department=validated_data.get('department', ''),
            subcounty=validated_data.get('subcounty', ''),
            assigned_nccg=validated_data.get('assigned_nccg', None),
            company_name=validated_data.get('company_name', ''),
            company_email=validated_data.get('company_email', ''),
            company_gmail_password=validated_data.get('company_gmail_password', None),
            custom_sending_domain=validated_data.get('custom_sending_domain', ''),
            email_send_method=validated_data.get('email_send_method', 'fallback'),
            created_by=created_by
        )
        return user

class InviteTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = InviteToken
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'used', 'created_by']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        return super().create(validated_data)
