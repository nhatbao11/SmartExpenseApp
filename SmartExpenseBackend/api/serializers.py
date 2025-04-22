from rest_framework import serializers
from .models import User, Transaction, Category
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, value):
        if not value.strip():
            raise serializers.ValidationError("Tên đăng nhập không được để trống")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Tên đăng nhập đã tồn tại")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email không được để trống")
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', value):
            raise serializers.ValidationError("Email không hợp lệ")
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng")
        return value

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("Mật khẩu phải có ít nhất 6 ký tự")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class TransactionSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'amount', 'transaction_type', 'category', 'description', 'created_at']