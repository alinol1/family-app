from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import SOSSignal
from .serializers import SOSSignalSerializer


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

        # Создаём SOS сигнал
        signal = SOSSignal.objects.create(
            sender=request.user,
            family=family,
            latitude=request.data.get('latitude'),
            longitude=request.data.get('longitude'),
            address=request.data.get('address', ''),
            status='sent'
        )

        serializer = SOSSignalSerializer(signal)
        return Response(
            serializer.data,
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

        # Ищем активный сигнал
        signal = SOSSignal.objects.filter(
            family=family
        ).exclude(
            status='cancelled'
        ).last()

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

        # Нельзя подтвердить свой же сигнал
        if signal.sender == request.user:
            return Response(
                {'error': 'Нельзя подтвердить свой сигнал'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Добавляем пользователя в список подтвердивших
        signal.confirmed_by.add(request.user)
        signal.status = 'confirmed'
        signal.save()

        serializer = SOSSignalSerializer(signal)
        return Response(serializer.data)


class CancelSOSView(APIView):
    """
    Отменить сигнал (я в безопасности).
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

        # Отменяем сигнал
        signal.status = 'cancelled'
        signal.cancelled_at = timezone.now()
        signal.save()

        return Response(
            {'message': 'Сигнал отменён. Рады что вы в безопасности!'},
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