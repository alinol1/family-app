from django.urls import path

from .views import NotificationListView, MarkNotificationsReadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications_list'),
    path('read/', MarkNotificationsReadView.as_view(), name='notifications_read'),
]