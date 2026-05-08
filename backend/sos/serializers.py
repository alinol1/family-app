from rest_framework import serializers
from .models import SOSSignal


class SOSSignalSerializer(serializers.ModelSerializer):
    """
    Сериализатор SOS сигнала.
    """

    # Имя отправителя
    sender_name = serializers.SerializerMethodField()

    # Аватар отправителя
    sender_avatar = serializers.ImageField(
        source='sender.avatar',
        read_only=True
    )

    # Активен ли сигнал
    is_active = serializers.BooleanField(read_only=True)

    # Кто подтвердил
    confirmed_by_names = serializers.SerializerMethodField()

    # Статус текстом
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = SOSSignal
        fields = [
            'id',
            'sender',
            'sender_name',
            'sender_avatar',
            'family',
            'latitude',
            'longitude',
            'address',
            'status',
            'status_display',
            'is_active',
            'confirmed_by',
            'confirmed_by_names',
            'created_at',
            'cancelled_at',
        ]
        read_only_fields = [
            'id',
            'sender',
            'family',
            'status',
            'confirmed_by',
            'created_at',
            'cancelled_at',
        ]

    def get_sender_name(self, obj):
        name = f'{obj.sender.first_name} {obj.sender.last_name}'.strip()
        return name or obj.sender.username
    
    def get_confirmed_by_names(self, obj):
        return [
            {
                'id': user.id,
                'name': f'{user.first_name} {user.last_name}'.strip() or user.username,
            }
            for user in obj.confirmed_by.all()
        ]