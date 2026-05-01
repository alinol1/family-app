from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Chat, Message
from .serializers import ChatSerializer, MessageSerializer
from users.models import User


class ChatListView(APIView):
    """
    Список всех чатов пользователя.
    GET /api/chat/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Получаем все чаты пользователя
        chats = Chat.objects.filter(
            members=request.user
        ).order_by('-created_at')

        serializer = ChatSerializer(
            chats,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class CreatePersonalChatView(APIView):
    """
    Создание личного чата с участником семьи.
    POST /api/chat/create/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'Укажите user_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Нельзя создать чат с самим собой
        if int(user_id) == request.user.id:
            return Response(
                {'error': 'Нельзя создать чат с самим собой'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ищем второго пользователя
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Пользователь не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем: чат уже существует?
        existing_chat = Chat.objects.filter(
            chat_type='personal',
            members=request.user
        ).filter(members=other_user).first()

        if existing_chat:
            serializer = ChatSerializer(
                existing_chat,
                context={'request': request}
            )
            return Response(serializer.data)

        # Создаём новый чат
        chat = Chat.objects.create(chat_type='personal')
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
        # Проверяем: пользователь в этом чате?
        try:
            chat = Chat.objects.get(
                id=chat_id,
                members=request.user
            )
        except Chat.DoesNotExist:
            return Response(
                {'error': 'Чат не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Получаем сообщения
        messages = chat.messages.all()

        # Отмечаем сообщения как прочитанные
        messages.exclude(
            sender=request.user
        ).update(is_read=True)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)


class SendMessageView(APIView):
    """
    Отправка сообщения.
    POST /api/chat/<chat_id>/send/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        # Проверяем: пользователь в этом чате?
        try:
            chat = Chat.objects.get(
                id=chat_id,
                members=request.user
            )
        except Chat.DoesNotExist:
            return Response(
                {'error': 'Чат не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Текст или медиафайл обязательны
        text = request.data.get('text')
        media = request.FILES.get('media')

        if not text and not media:
            return Response(
                {'error': 'Сообщение не может быть пустым'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создаём сообщение
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