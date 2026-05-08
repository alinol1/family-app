from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import SOSSignal
from .serializers import SOSSignalSerializer


def get_user_display_name(user):
    return f'{user.first_name} {user.last_name}'.strip() or user.username


def send_sos_websocket_event(family_id, event_type, signal_data, extra_data=None):
    channel_layer = get_channel_layer()

    data = {
        'type': event_type,
        'signal': signal_data,
    }

    if extra_data:
        data.update(extra_data)

    async_to_sync(channel_layer.group_send)(
        f'family_sos_{family_id}',
        data
    )


class SendSOSView(APIView):
    """
    Отправка экстренного сигнала.
    POST /api/sos/send/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Если уже есть активный сигнал этого пользователя — не плодим дубли
        existing_signal = SOSSignal.objects.filter(
            family=family,
            sender=request.user
        ).exclude(
            status='cancelled'
        ).order_by('-created_at').first()

        if existing_signal:
            serializer = SOSSignalSerializer(existing_signal)
            return Response(serializer.data, status=status.HTTP_200_OK)

        signal = SOSSignal.objects.create(
            sender=request.user,
            family=family,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            address=request.data.get('address', ''),
            status='sent'
        )

        serializer = SOSSignalSerializer(signal)
        signal_data = serializer.data

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
    Активный SOS сигнал семьи.
    GET /api/sos/active/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        signal = SOSSignal.objects.filter(
            family=family
        ).exclude(
            status='cancelled'
        ).order_by('-created_at').first()

        if not signal:
            return Response(
                {'message': 'Активных сигналов нет'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = SOSSignalSerializer(signal)
        return Response(serializer.data)


class ConfirmSOSView(APIView):
    """
    Подтвердить получение сигнала.
    POST /api/sos/<signal_id>/confirm/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, signal_id):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        try:
            signal = SOSSignal.objects.get(
                id=signal_id,
                family=family
            )
        except SOSSignal.DoesNotExist:
            return Response(
                {'error': 'Сигнал не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        if signal.status == 'cancelled':
            return Response(
                {'error': 'Сигнал уже отменён'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if signal.sender == request.user:
            return Response(
                {'error': 'Нельзя подтвердить свой сигнал'},
                status=status.HTTP_400_BAD_REQUEST
            )

        signal.confirmed_by.add(request.user)
        signal.status = 'confirmed'
        signal.save()

        serializer = SOSSignalSerializer(signal)
        signal_data = serializer.data

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
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            signal = SOSSignal.objects.get(
                id=signal_id,
                sender=request.user
            )
        except SOSSignal.DoesNotExist:
            return Response(
                {'error': 'Сигнал не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        signal.status = 'cancelled'
        signal.cancelled_at = timezone.now()
        signal.save()

        serializer = SOSSignalSerializer(signal)
        signal_data = serializer.data

        cancelled_by_data = {
            'id': request.user.id,
            'name': get_user_display_name(request.user),
        }

        send_sos_websocket_event(
            family_id=signal.family.id,
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
    История SOS сигналов семьи.
    GET /api/sos/history/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        signals = SOSSignal.objects.filter(
            family=family
        ).order_by('-created_at')

        serializer = SOSSignalSerializer(signals, many=True)
        return Response(serializer.data)