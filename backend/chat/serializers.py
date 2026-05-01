from rest_framework import serializers
from .models import Chat, Message
from users.models import User


class MessageSerializer(serializers.ModelSerializer):
    """
    Сериализатор сообщения.
    """

    # Имя отправителя
    sender_name = serializers.SerializerMethodField()

    # Аватар отправителя
    sender_avatar = serializers.ImageField(
        source='sender.avatar',
        read_only=True
    )

    class Meta:
        model = Message
        fields = [
            'id',
            'chat',
            'sender',
            'sender_name',
            'sender_avatar',
            'text',
            'media',
            'is_read',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'sender',
            'is_read',
            'created_at',
        ]

    def get_sender_name(self, obj):
        return f'{obj.sender.first_name} {obj.sender.last_name}'


class ChatSerializer(serializers.ModelSerializer):
    """
    Сериализатор чата.
    """

    # Последнее сообщение
    last_message = serializers.SerializerMethodField()

    # Количество непрочитанных
    unread_count = serializers.SerializerMethodField()

    # Название чата
    chat_name = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            'id',
            'chat_type',
            'family',
            'chat_name',
            'last_message',
            'unread_count',
            'created_at',
        ]

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return {
                'text': last.text,
                'sender': last.sender.first_name,
                'created_at': last.created_at,
            }
        return None

    def get_unread_count(self, obj):
        user = self.context.get('request').user
        return obj.messages.filter(
            is_read=False
        ).exclude(sender=user).count()

    def get_chat_name(self, obj):
        if obj.chat_type == 'family':
            return f'Семейный чат — {obj.family.name}'

        # Для личного чата показываем имя собеседника
        user = self.context.get('request').user
        other = obj.members.exclude(id=user.id).first()
        if other:
            return f'{other.first_name} {other.last_name}'
        return 'Личный чат'