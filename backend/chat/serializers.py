from rest_framework import serializers

from families.models import FamilyMember
from .models import Chat, Message
from users.models import User

def get_user_display_name(user):
    if not user:
        return None

    name = f'{user.first_name} {user.last_name}'.strip()
    return name or user.username


class ChatMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='id', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'user_id',
            'full_name',
            'first_name',
            'last_name',
            'avatar_url',
            'role',
        ]

    def get_full_name(self, obj):
        return get_user_display_name(obj)

    def get_avatar_url(self, obj):
        request = self.context.get('request')

        if not obj.avatar:
            return None

        url = obj.avatar.url

        if request and url.startswith('/'):
            return request.build_absolute_uri(url)

        return url


class FamilyAvailableMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'user_id',
            'full_name',
            'avatar_url',
            'role',
        ]

    def get_full_name(self, obj):
        return get_user_display_name(obj.user)

    def get_avatar_url(self, obj):
        request = self.context.get('request')

        if not obj.user.avatar:
            return None

        url = obj.user.avatar.url

        if request and url.startswith('/'):
            return request.build_absolute_uri(url)

        return url


class MessageSerializer(serializers.ModelSerializer):
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
        request = self.context.get('request')

        if not obj.sender or not obj.sender.avatar:
            return None

        url = obj.sender.avatar.url

        if request and url.startswith('/'):
            return request.build_absolute_uri(url)

        return url

    def get_media_url(self, obj):
        request = self.context.get('request')

        if not obj.media:
            return None

        url = obj.media.url

        if request and url.startswith('/'):
            return request.build_absolute_uri(url)

        return url


class ChatSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    chat_name = serializers.SerializerMethodField()
    chat_subtitle = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            'id',
            'chat_type',
            'chat_name',
            'chat_subtitle',
            'title',
            'last_message',
            'unread_count',
            'created_at',
            'updated_at',
            'members_count',
            'members',
            'is_pinned',
            'is_main_family_chat',
            'can_manage',
            'photo_url',
        ]

    def get_members_count(self, obj):
        return obj.members.count()

    def get_members(self, obj):
        request = self.context.get('request')

        return ChatMemberSerializer(
            obj.members.all(),
            many=True,
            context={'request': request}
        ).data

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
            if obj.title:
                return obj.title

            if obj.is_main_family_chat and obj.family:
                return obj.family.name

            return 'Групповой чат'

        request = self.context.get('request')

        if not request or not request.user or request.user.is_anonymous:
            return 'Личный чат'

        other_user = obj.members.exclude(id=request.user.id).first()

        if other_user:
            return get_user_display_name(other_user)

        return 'Личный чат'

    def get_chat_subtitle(self, obj):
        request = self.context.get('request')

        if obj.chat_type == 'personal':
            return 'Личный чат'

        members = list(obj.members.all())

        if not members:
            return 'Нет участников'

        names = []

        for member in members:
            if request and member.id == request.user.id:
                names.append('Вы')
            else:
                names.append(get_user_display_name(member))

        if len(names) <= 3:
            return ', '.join(names)

        return ', '.join(names[:3]) + f' и ещё {len(names) - 3}'

    def get_can_manage(self, obj):
        if obj.is_main_family_chat:
            return False

        return True
    def get_photo_url(self, obj):
        request = self.context.get('request')

        if not obj.photo:
            return None

        url = obj.photo.url

        if request and url.startswith('/'):
            return request.build_absolute_uri(url)

        return url

class CreateGroupChatSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, required=False, allow_blank=True)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )


class UpdateChatSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, required=False, allow_blank=True)


class AddChatMembersSerializer(serializers.Serializer):
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False
    )
class ChatPhotoSerializer(serializers.Serializer):
    photo = serializers.ImageField(required=True)