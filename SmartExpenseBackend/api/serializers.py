from rest_framework import serializers
from .models import User, Category, Transaction

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

class CategorySerializer(serializers.ModelSerializer):
    user_id = serializers.SerializerMethodField()  # Thêm để trả về user_id

    class Meta:
        model = Category
        fields = ['id', 'name', 'type', 'icon', 'user_id', 'is_default']

    def get_user_id(self, obj):
        return obj.user.id if obj.user else None  # Trả về user.id hoặc None

class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = ['id', 'description', 'amount', 'transaction_type', 'category', 'category_name', 'created_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None