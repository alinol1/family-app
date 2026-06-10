from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import SOSSignal
from .serializers import SOSSignalSerializer

from notifications.services import create_family_notification


ACTIVE_SOS_STATUSES = ['sent', 'received', 'confirmed']


def get_user_family(user):
    """
    Возвращает семью пользователя.
    Если пользователь не состоит в семье — возвращает None.
    """
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def get_user_display_name(user):
    """
    Возвращает имя пользователя для отображения.
    """
    return f'{user.first_name} {user.last_name}'.strip() or user.username


def make_json_safe(value):
    """
    Приводит данные к виду, который безопасно отправлять через Channels Redis.
    Redis serializer не умеет напрямую работать с datetime, Decimal, UUID.
    """
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, UUID):
        return str(value)

    if isinstance(value, dict):
        return {
            str(key): make_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            make_json_safe(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            make_json_safe(item)
            for item in value
        ]

    return value


def serialize_sos_signal(signal):
    serializer = SOSSignalSerializer(signal)
    return make_json_safe(serializer.data)


def send_sos_websocket_event(family_id, event_type, signal_data, extra_data=None):
    """
    Отправляет WebSocket-событие всем участникам семьи.
    """
    channel_layer = get_channel_layer()

    if not channel_layer:
        return

    data = {
        'type': event_type,
        'signal': make_json_safe(signal_data),
    }

    if extra_data:
        data.update(make_json_safe(extra_data))

    async_to_sync(channel_layer.group_send)(
        f'family_sos_{family_id}',
        make_json_safe(data)
    )


def get_family_signal_or_404(user, signal_id):
    """
    Безопасно получает SOS-сигнал только из семьи пользователя.
    Если пользователь не в семье или сигнал чужой — возвращает ошибку.
    """
    family = get_user_family(user)

    if not family:
        return None, None, Response(
            {'error': 'Вы не состоите в семье'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        signal = SOSSignal.objects.get(
            id=signal_id,
            family=family
        )
    except SOSSignal.DoesNotExist:
        return family, None, Response(
            {'error': 'Сигнал не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    return family, signal, None


class SendSOSView(APIView):
    """
    Отправка экстренного сигнала.
    POST /api/sos/send/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        existing_signal = SOSSignal.objects.filter(
            family=family,
            sender=request.user,
            status__in=ACTIVE_SOS_STATUSES
        ).order_by('-created_at').first()

        if existing_signal:
            signal_data = serialize_sos_signal(existing_signal)
            return Response(signal_data, status=status.HTTP_200_OK)

        signal = SOSSignal.objects.create(
            sender=request.user,
            family=family,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            address=request.data.get('address', ''),
            status='sent'
        )

        create_family_notification(
            family=family,
            notification_type='sos',
            title='SOS-сигнал',
            message=f'{request.user.first_name or request.user.username} отправил SOS-сигнал',
            created_by=request.user,
        )

        signal_data = serialize_sos_signal(signal)

        send_sos_websocket_event(
            family_id=family.id,
            event_type='sos_alert',
            signal_data=signal_data,
        )

        return Response(
            signal_data,
            status=status.HTTP_201_CREATED
        )


class ActiveSOSView(APIView):
    """
    Активный SOS-сигнал семьи.
    GET /api/sos/active/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        signal = SOSSignal.objects.filter(
            family=family,
            status__in=ACTIVE_SOS_STATUSES
        ).order_by('-created_at').first()

        if not signal:
            return Response(
                {'message': 'Активных сигналов нет'},
                status=status.HTTP_404_NOT_FOUND
            )

        signal_data = serialize_sos_signal(signal)
        return Response(signal_data)


class ConfirmSOSView(APIView):
    """
    Подтвердить получение сигнала.
    POST /api/sos/<signal_id>/confirm/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, signal_id):
        family, signal, error_response = get_family_signal_or_404(
            user=request.user,
            signal_id=signal_id
        )

        if error_response:
            return error_response

        if signal.status == 'cancelled':
            return Response(
                {'error': 'Сигнал уже отменён'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if signal.sender_id == request.user.id:
            return Response(
                {'error': 'Нельзя подтвердить свой сигнал'},
                status=status.HTTP_400_BAD_REQUEST
            )

        signal.confirmed_by.add(request.user)
        signal.status = 'confirmed'
        signal.save()

        signal_data = serialize_sos_signal(signal)

        confirmed_by_data = {
            'id': request.user.id,
            'name': get_user_display_name(request.user),
        }

        send_sos_websocket_event(
            family_id=family.id,
            event_type='sos_confirmed',
            signal_data=signal_data,
            extra_data={
                'confirmed_by': confirmed_by_data,
            }
        )

        return Response(signal_data)


class CancelSOSView(APIView):
    """
    Отменить сигнал.
    POST /api/sos/<signal_id>/cancel/
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, signal_id):
        family, signal, error_response = get_family_signal_or_404(
            user=request.user,
            signal_id=signal_id
        )

        if error_response:
            return error_response

        if signal.sender_id != request.user.id:
            return Response(
                {'error': 'Только отправитель может отменить SOS-сигнал'},
                status=status.HTTP_403_FORBIDDEN
            )

        if signal.status == 'cancelled':
            return Response(
                {'error': 'Сигнал уже отменён'},
                status=status.HTTP_400_BAD_REQUEST
            )

        signal.status = 'cancelled'
        signal.cancelled_at = timezone.now()
        signal.save()

        signal_data = serialize_sos_signal(signal)

        cancelled_by_data = {
            'id': request.user.id,
            'name': get_user_display_name(request.user),
        }

        send_sos_websocket_event(
            family_id=family.id,
            event_type='sos_cancelled',
            signal_data=signal_data,
            extra_data={
                'cancelled_by': cancelled_by_data,
            }
        )

        return Response(
            {'message': 'Сигнал отменён'},
            status=status.HTTP_200_OK
        )


class SOSHistoryView(APIView):
    """
    История SOS-сигналов семьи.
    GET /api/sos/history/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        signals = SOSSignal.objects.filter(
            family=family
        ).order_by('-created_at')

        serializer = SOSSignalSerializer(signals, many=True)
        return Response(make_json_safe(serializer.data))