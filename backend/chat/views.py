from django.db import transaction
from django.db.models import Max
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from families.models import FamilyMember
from users.models import User
from .models import Chat, Message
from datetime import date, datetime
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .serializers import (
    ChatSerializer,
    MessageSerializer,
    CreateGroupChatSerializer,
    UpdateChatSerializer,
    AddChatMembersSerializer,
    FamilyAvailableMemberSerializer,
    ChatPhotoSerializer,
)

def broadcast_chat_update(chat, message, request):
    channel_layer = get_channel_layer()

    if not channel_layer:
        return

    message_data = MessageSerializer(
        message,
        context={'request': request}
    ).data

    async_to_sync(channel_layer.group_send)(
        f'chat_{chat.id}',
        {
            'type': 'chat_message',
            'message': message_data,
        }
    )

    for user in chat.members.all():
        chat_data = ChatSerializer(
            chat,
            context={
                'request': type(
                    'Request',
                    (),
                    {'user': user}
                )()
            }
        ).data

        async_to_sync(channel_layer.group_send)(
            f'user_chats_{user.id}',
            {
                'type': 'chat_list_update',
                'chat': chat_data,
            }
        )

def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def get_user_family_role(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.role


def is_user_family_admin(user):
    role = get_user_family_role(user)
    return role in ['admin', 'creator']


def ensure_main_family_chat(family):
    main_chat = Chat.objects.filter(
        family=family,
        chat_type='family',
        is_main_family_chat=True
    ).first()

    if main_chat:
        if not main_chat.is_pinned:
            main_chat.is_pinned = True
            main_chat.save(update_fields=['is_pinned', 'updated_at'])

        return main_chat

    existing_family_chat = Chat.objects.filter(
        family=family,
        chat_type='family'
    ).order_by('created_at').first()

    if existing_family_chat:
        existing_family_chat.is_main_family_chat = True
        existing_family_chat.is_pinned = True

        if not existing_family_chat.title:
            existing_family_chat.title = family.name or 'Семейный чат'

        existing_family_chat.save(
            update_fields=[
                'is_main_family_chat',
                'is_pinned',
                'title',
                'updated_at',
            ]
        )

        members = User.objects.filter(family_membership__family=family)
        existing_family_chat.members.set(members)

        return existing_family_chat

    chat = Chat.objects.create(
        family=family,
        chat_type='family',
        title=family.name or 'Семейный чат',
        is_pinned=True,
        is_main_family_chat=True
    )

    members = User.objects.filter(family_membership__family=family)
    chat.members.set(members)

    return chat


def get_chat_for_user(user, chat_id):
    family = get_user_family(user)

    if not family:
        return None, Response(
            {'error': 'Вы не состоите в семье'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        chat = Chat.objects.prefetch_related('members').get(
            id=chat_id,
            family=family,
            members=user
        )
    except Chat.DoesNotExist:
        return None, Response(
            {'error': 'Чат не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    return chat, None

def make_json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            key: make_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            make_json_safe(item)
            for item in value
        ]

    return value


def broadcast_chat_update(chat, message, request):
    channel_layer = get_channel_layer()

    if not channel_layer:
        return

    message_data = MessageSerializer(
        message,
        context={'request': request}
    ).data

    message_data = make_json_safe(message_data)

    async_to_sync(channel_layer.group_send)(
        f'chat_{chat.id}',
        {
            'type': 'chat_message',
            'message': message_data,
        }
    )

    for user in chat.members.all():
        fake_request = type(
            'Request',
            (),
            {
                'user': user
            }
        )()

        chat_data = ChatSerializer(
            chat,
            context={
                'request': fake_request
            }
        ).data

        chat_data = make_json_safe(chat_data)

        async_to_sync(channel_layer.group_send)(
            f'user_chats_{user.id}',
            {
                'type': 'chat_list_update',
                'chat': chat_data,
            }
        )



def get_family_users_by_ids(family, user_ids):
    users = User.objects.filter(
        id__in=user_ids,
        family_membership__family=family
    ).distinct()

    found_ids = set(users.values_list('id', flat=True))
    requested_ids = set(user_ids)

    if found_ids != requested_ids:
        return None, Response(
            {'error': 'Некоторые пользователи не найдены в вашей семье'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return users, None


class ChatListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ensure_main_family_chat(family)

        chats = Chat.objects.filter(
            family=family,
            members=request.user
        ).prefetch_related(
            'members'
        ).annotate(
            last_message_at=Max('messages__created_at')
        ).order_by(
            '-is_pinned',
            '-last_message_at',
            '-updated_at',
            '-created_at'
        )

        serializer = ChatSerializer(
            chats,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class CreatePersonalChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Укажите user_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Некорректный user_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_id == request.user.id:
            return Response(
                {'error': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            other_user = User.objects.get(
                id=user_id,
                family_membership__family=family
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден в вашей семье'},
                status=status.HTTP_404_NOT_FOUND
            )

        existing_chat = Chat.objects.filter(
            chat_type='personal',
            family=family,
            members=request.user
        ).filter(
            members=other_user
        ).first()

        if existing_chat:
            serializer = ChatSerializer(
                existing_chat,
                context={'request': request}
            )

            return Response(serializer.data)

        chat = Chat.objects.create(
            chat_type='personal',
            family=family
        )

        chat.members.add(request.user, other_user)

        serializer = ChatSerializer(
            chat,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class CreateGroupChatView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreateGroupChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        title = serializer.validated_data.get('title', '').strip()
        member_ids = serializer.validated_data.get('member_ids', [])

        member_ids = list(set(member_ids))
        member_ids.append(request.user.id)
        member_ids = list(set(member_ids))

        members, error = get_family_users_by_ids(family, member_ids)

        if error:
            return error

        chat = Chat.objects.create(
            chat_type='family',
            family=family,
            title=title or 'Групповой чат',
            is_pinned=False,
            is_main_family_chat=False
        )

        chat.members.set(members)

        serializer = ChatSerializer(
            chat,
            context={'request': request}
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        serializer = ChatSerializer(
            chat,
            context={'request': request}
        )

        return Response(serializer.data)

    def patch(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        if chat.chat_type != 'family':
            return Response(
                {'error': 'Название можно менять только у группового чата'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if chat.is_main_family_chat:
            return Response(
                {'error': 'Основной семейный чат нельзя изменять'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = UpdateChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if 'title' in serializer.validated_data:
            chat.title = serializer.validated_data.get('title', '').strip() or 'Групповой чат'

        chat.save()

        return Response(
            ChatSerializer(chat, context={'request': request}).data
        )

    def delete(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        if chat.is_main_family_chat:
            return Response(
                {'error': 'Основной семейный чат удалить нельзя'},
                status=status.HTTP_400_BAD_REQUEST
            )

        chat.delete()

        return Response(
            {'message': 'Чат удалён'},
            status=status.HTTP_200_OK
        )


class ChatSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        family = get_user_family(request.user)

        family_members = FamilyMember.objects.filter(
            family=family
        ).select_related('user')

        return Response({
            'chat': ChatSerializer(
                chat,
                context={'request': request}
            ).data,
            'family_members': FamilyAvailableMemberSerializer(
                family_members,
                many=True,
                context={'request': request}
            ).data,
        })


class AddChatMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        if chat.chat_type != 'family':
            return Response(
                {'error': 'Участников можно добавлять только в групповой чат'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if chat.is_main_family_chat:
            return Response(
                {'error': 'Основной семейный чат нельзя изменять'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AddChatMembersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member_ids = serializer.validated_data['member_ids']

        family = get_user_family(request.user)
        users, error = get_family_users_by_ids(family, member_ids)

        if error:
            return error

        chat.members.add(*users)

        return Response(
            ChatSerializer(chat, context={'request': request}).data
        )


class RemoveChatMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, chat_id, user_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        if chat.chat_type != 'family':
            return Response(
                {'error': 'Участников можно удалять только из группового чата'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if chat.is_main_family_chat:
            return Response(
                {'error': 'Основной семейный чат нельзя изменять'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_id == request.user.id and chat.members.count() <= 1:
            return Response(
                {'error': 'Нельзя удалить последнего участника чата'},
                status=status.HTTP_400_BAD_REQUEST
            )

        chat.members.remove(user_id)

        if chat.members.count() == 0:
            chat.delete()

            return Response(
                {'message': 'Чат удалён, так как участников не осталось'},
                status=status.HTTP_200_OK
            )

        return Response(
            ChatSerializer(chat, context={'request': request}).data
        )


class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        chat, error_response = get_chat_for_user(
            user=request.user,
            chat_id=chat_id
        )

        if error_response:
            return error_response

        messages = Message.objects.filter(
            chat=chat
        ).select_related(
            'sender'
        ).order_by('created_at')

        messages.exclude(
            sender=request.user
        ).update(is_read=True)

        serializer = MessageSerializer(
            messages,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, chat_id):
        chat, error_response = get_chat_for_user(
            user=request.user,
            chat_id=chat_id
        )

        if error_response:
            return error_response

        text = str(request.data.get('text', '')).strip()
        media = request.FILES.get('media')

        if not text and not media:
            return Response(
                {'error': 'Сообщение не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = Message.objects.create(
            chat=chat,
            sender=request.user,
            text=text,
            media=media
        )

        chat.save(update_fields=['updated_at'])

        broadcast_chat_update(
            chat=chat,
            message=message,
            request=request
        )

        serializer = MessageSerializer(
            message,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    
class ChatPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        if chat.chat_type != 'family':
            return Response(
                {'error': 'Фото можно менять только у группового чата'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if chat.is_main_family_chat:
            return Response(
                {'error': 'Фото основного семейного чата пока нельзя изменять'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ChatPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if chat.photo:
            chat.photo.delete(save=False)

        chat.photo = serializer.validated_data['photo']
        chat.save()

        return Response(
            ChatSerializer(chat, context={'request': request}).data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, chat_id):
        chat, error_response = get_chat_for_user(request.user, chat_id)

        if error_response:
            return error_response

        if chat.chat_type != 'family':
            return Response(
                {'error': 'Фото можно удалять только у группового чата'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if chat.photo:
            chat.photo.delete(save=False)

        chat.photo = None
        chat.save()

        return Response(
            ChatSerializer(chat, context={'request': request}).data,
            status=status.HTTP_200_OK
        )