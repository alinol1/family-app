from rest_framework import serializers

from .models import FamilyNotification


def get_user_name(user):
    if not user:
        return None

    full_name = f'{user.first_name} {user.last_name}'.strip()
    return full_name or user.username


class FamilyNotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FamilyNotification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'created_by_name',
            'is_read',
            'created_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_name(obj.created_by)