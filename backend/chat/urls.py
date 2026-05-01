from django.urls import path
from .views import (
    ChatListView,
    CreatePersonalChatView,
    MessageListView,
    SendMessageView,
)

urlpatterns = [
    # Список чатов
    path('', ChatListView.as_view(), name='chat_list'),

    # Создать личный чат
    path('create/', CreatePersonalChatView.as_view(), name='create_chat'),

    # Сообщения в чате
    path('<int:chat_id>/messages/', MessageListView.as_view(), name='messages'),

    # Отправить сообщение
    path('<int:chat_id>/send/', SendMessageView.as_view(), name='send_message'),
]