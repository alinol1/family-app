from rest_framework import serializers

from .models import FamilyTask, ShoppingItem


def get_user_name(user):
    if not user:
        return None

    full_name = f'{user.first_name} {user.last_name}'.strip()
    return full_name or user.username


class FamilyTaskSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FamilyTask
        fields = [
            'id',
            'title',
            'is_done',
            'created_by_name',
            'completed_by_name',
            'completed_at',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_name(obj.created_by)

    def get_completed_by_name(self, obj):
        return get_user_name(obj.completed_by)


class ShoppingItemSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingItem
        fields = [
            'id',
            'title',
            'is_done',
            'created_by_name',
            'completed_by_name',
            'completed_at',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_name(obj.created_by)

    def get_completed_by_name(self, obj):
        return get_user_name(obj.completed_by)