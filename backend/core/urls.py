from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Админка
    path('admin/', admin.site.urls),

    # API авторизации
    path('api/auth/', include('users.urls')),

    # API семьи
    path('api/families/', include('families.urls')),

    # API чата
    path('api/chat/', include('chat.urls')),

    # API финансы
    path('api/finance/', include('finance.urls')),

    # API документы
    path('api/documents/', include('documents.urls')),

    # API фотографии
    path('api/photos/', include('photos.urls')),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
    