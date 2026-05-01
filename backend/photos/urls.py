from django.urls import path
from .views import (
    PhotoListView,
    UploadPhotoView,
    PhotoDetailView,
    PhotosByMonthView,
)

urlpatterns = [
    # Все фото семьи
    path('', PhotoListView.as_view(), name='photo_list'),

    # Загрузить фото
    path('upload/', UploadPhotoView.as_view(), name='upload_photo'),

    # Фото по месяцам
    path('by-month/', PhotosByMonthView.as_view(), name='photos_by_month'),

    # Просмотр и удаление
    path('<int:photo_id>/', PhotoDetailView.as_view(), name='photo_detail'),
]