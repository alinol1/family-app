from django.urls import path
from .consumers import ChatConsumer, ChatListConsumer

websocket_urlpatterns = [
    path('ws/chat/<int:chat_id>/', ChatConsumer.as_asgi()),
    path('ws/chats/', ChatListConsumer.as_asgi()),
]