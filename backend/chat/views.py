from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Chat, Message
from .serializers import ChatSerializer, MessageSerializer

from users.models import User


def get_user_family(user):
    """
    Возвращает семью пользователя.
    Если пользователь не состоит в семье — возвращает None.
    """
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def get_chat_for_user(user, chat_id):
    """
    Безопасно получает чат пользователя.

    Проверяет:
    1. пользователь состоит в семье;
    2. чат принадлежит семье пользователя;
    3. пользователь является участником этого чата.
    """
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


class ChatListView(APIView):
    """
    Список всех чатов пользователя.
    GET /api/chat/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        chats = Chat.objects.filter(
            family=family,
            members=request.user
        ).prefetch_related(
            'members'
        ).order_by('-created_at')

        serializer = ChatSerializer(
            chats,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class CreatePersonalChatView(APIView):
    """
    Создание личного чата только с пользователем из своей семьи.
    POST /api/chat/personal/
    """

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


class MessageListView(APIView):
    """
    Список сообщений в чате.
    GET /api/chat/<chat_id>/messages/
    """

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
            many=True
        )

        return Response(serializer.data)


class SendMessageView(APIView):
    """
    Отправка сообщения.
    POST /api/chat/<chat_id>/send/
    """

    permission_classes = [IsAuthenticated]

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

        serializer = MessageSerializer(message)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )