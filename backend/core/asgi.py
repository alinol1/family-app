import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

django_asgi_app = get_asgi_application()

from chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns
from sos.routing import websocket_urlpatterns as sos_websocket_urlpatterns
from chat.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JWTAuthMiddleware(
        URLRouter(
            chat_websocket_urlpatterns + sos_websocket_urlpatterns
        )
    ),
})