from django.urls import path

from .consumers import ChatConsumer, ChatListConsumer
from users.consumers import PresenceConsumer

websocket_urlpatterns = [
    path('ws/chat/<int:chat_id>/', ChatConsumer.as_asgi()),
    path('ws/chats/', ChatListConsumer.as_asgi()),
    path('ws/presence/', PresenceConsumer.as_asgi()),
]