from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FamilyNotification
from .serializers import FamilyNotificationSerializer


def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response({
                'notifications': [],
                'unread_count': 0,
            })

        notifications = FamilyNotification.objects.filter(
            family=family
        )[:50]

        unread_count = FamilyNotification.objects.filter(
            family=family,
            is_read=False
        ).count()

        return Response({
            'notifications': FamilyNotificationSerializer(
                notifications,
                many=True
            ).data,
            'unread_count': unread_count,
        })


class MarkNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response({'message': 'ok'})

        FamilyNotification.objects.filter(
            family=family,
            is_read=False
        ).update(is_read=True)

        return Response({'message': 'Уведомления прочитаны'})