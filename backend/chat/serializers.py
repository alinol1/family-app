from rest_framework import serializers

from .models import Chat, Message


def get_user_display_name(user):
    """
    Возвращает отображаемое имя пользователя.
    """
    if not user:
        return None

    name = f'{user.first_name} {user.last_name}'.strip()
    return name or user.username


class MessageSerializer(serializers.ModelSerializer):
    """
    Сериализатор сообщения.

    Важно:
    - сырое поле media не отдаём;
    - отдаём только media_url;
    - sender оставляем как id пользователя;
    - sender_name нужен для отображения.
    """

    sender_name = serializers.SerializerMethodField()
    sender_avatar_url = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id',
            'chat',
            'sender',
            'sender_name',
            'sender_avatar_url',
            'text',
            'media_url',
            'is_read',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'chat',
            'sender',
            'sender_name',
            'sender_avatar_url',
            'text',
            'media_url',
            'is_read',
            'created_at',
        ]

    def get_sender_name(self, obj):
        return get_user_display_name(obj.sender)

    def get_sender_avatar_url(self, obj):
        if not obj.sender:
            return None

        if not obj.sender.avatar:
            return None

        return obj.sender.avatar.url

    def get_media_url(self, obj):
        if not obj.media:
            return None

        return obj.media.url


class ChatSerializer(serializers.ModelSerializer):
    """
    Сериализатор чата.

    Важно:
    - family наружу не отдаём;
    - chat_name формируется на backend;
    - unread_count считается для текущего пользователя.
    """

    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    chat_name = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            'id',
            'chat_type',
            'chat_name',
            'last_message',
            'unread_count',
            'created_at',
            'members_count',
        ]

        read_only_fields = [
            'id',
            'chat_type',
            'chat_name',
            'last_message',
            'unread_count',
            'created_at',
            'members_count',
        ]

    def get_members_count(self, obj):
        return obj.members.count()

    def get_last_message(self, obj):
        last_message = obj.messages.order_by('created_at').last()

        if not last_message:
            return None

        return {
            'text': last_message.text,
            'sender': get_user_display_name(last_message.sender),
            'created_at': last_message.created_at,
        }

    def get_unread_count(self, obj):
        request = self.context.get('request')

        if not request or not request.user or request.user.is_anonymous:
            return 0

        return obj.messages.filter(
            is_read=False
        ).exclude(
            sender=request.user
        ).count()

    def get_chat_name(self, obj):
        if obj.chat_type == 'family':
            return obj.family.name if obj.family else 'Семейный чат'

        request = self.context.get('request')

        if not request or not request.user or request.user.is_anonymous:
            return 'Личный чат'

        other_user = obj.members.exclude(
            id=request.user.id
        ).first()

        if other_user:
            return get_user_display_name(other_user)

        return 'Личный чат'