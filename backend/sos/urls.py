from django.urls import path
from .views import (
    SendSOSView,
    ActiveSOSView,
    ConfirmSOSView,
    CancelSOSView,
    SOSHistoryView,
)

urlpatterns = [
    # Отправить сигнал
    path('send/', SendSOSView.as_view(), name='send_sos'),

    # Активный сигнал
    path('active/', ActiveSOSView.as_view(), name='active_sos'),

    # Подтвердить получение
    path('<int:signal_id>/confirm/', ConfirmSOSView.as_view(), name='confirm_sos'),

    # Отменить сигнал
    path('<int:signal_id>/cancel/', CancelSOSView.as_view(), name='cancel_sos'),

    # История
    path('history/', SOSHistoryView.as_view(), name='sos_history'),
]