from django.urls import path
from .consumers import SOSConsumer

websocket_urlpatterns = [
    path('ws/sos/', SOSConsumer.as_asgi()),
]