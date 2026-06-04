from datetime import date, datetime

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FamilyTask, ShoppingItem
from .serializers import FamilyTaskSerializer, ShoppingItemSerializer

from notifications.services import create_family_notification


def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def make_json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            key: make_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            make_json_safe(item)
            for item in value
        ]

    return value


def broadcast_activity_update(family, action, item_type, item=None, item_id=None):
    channel_layer = get_channel_layer()

    if not channel_layer or not family:
        return

    async_to_sync(channel_layer.group_send)(
        f'family_activity_{family.id}',
        {
            'type': 'activity_event',
            'action': action,
            'item_type': item_type,
            'item': make_json_safe(item),
            'item_id': item_id,
        }
    )


class ActivityOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tasks = FamilyTask.objects.filter(family=family)
        shopping_items = ShoppingItem.objects.filter(family=family)

        return Response({
            'tasks': FamilyTaskSerializer(tasks, many=True).data,
            'shopping_items': ShoppingItemSerializer(shopping_items, many=True).data,
        })


class FamilyTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = str(request.data.get('title', '')).strip()

        if not title:
            return Response(
                {'error': 'Введите название задачи'},
                status=status.HTTP_400_BAD_REQUEST
            )

        task = FamilyTask.objects.create(
            family=family,
            title=title,
            created_by=request.user
        )

        create_family_notification(
            family=family,
            notification_type='task',
            title='Новая задача',
            message=f'Добавлена задача: {task.title}',
            created_by=request.user,
        )

        task_data = FamilyTaskSerializer(task).data

        broadcast_activity_update(
            family=family,
            action='create',
            item_type='task',
            item=task_data,
            item_id=task.id
        )

        return Response(
            task_data,
            status=status.HTTP_201_CREATED
        )


class FamilyTaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            task = FamilyTask.objects.get(id=task_id, family=family)
        except FamilyTask.DoesNotExist:
            return Response(
                {'error': 'Задача не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        if 'title' in request.data:
            title = str(request.data.get('title', '')).strip()

            if not title:
                return Response(
                    {'error': 'Название задачи не может быть пустым'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            task.title = title

        if 'is_done' in request.data:
            is_done = bool(request.data.get('is_done'))

            task.is_done = is_done

            if is_done:
                task.completed_by = request.user
                task.completed_at = timezone.now()
            else:
                task.completed_by = None
                task.completed_at = None

        task.save()

        task_data = FamilyTaskSerializer(task).data

        broadcast_activity_update(
            family=family,
            action='update',
            item_type='task',
            item=task_data,
            item_id=task.id
        )

        return Response(task_data)

    def delete(self, request, task_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted_count, _ = FamilyTask.objects.filter(
            id=task_id,
            family=family
        ).delete()

        if deleted_count == 0:
            return Response(
                {'error': 'Задача не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        broadcast_activity_update(
            family=family,
            action='delete',
            item_type='task',
            item=None,
            item_id=task_id
        )

        return Response({'message': 'Задача удалена'})


class ShoppingItemListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = str(request.data.get('title', '')).strip()

        if not title:
            return Response(
                {'error': 'Введите название продукта'},
                status=status.HTTP_400_BAD_REQUEST
            )

        item = ShoppingItem.objects.create(
            family=family,
            title=title,
            created_by=request.user
        )

        item_data = ShoppingItemSerializer(item).data

        broadcast_activity_update(
            family=family,
            action='create',
            item_type='shopping_item',
            item=item_data,
            item_id=item.id
        )

        return Response(
            item_data,
            status=status.HTTP_201_CREATED
        )


class ShoppingItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            item = ShoppingItem.objects.get(id=item_id, family=family)
        except ShoppingItem.DoesNotExist:
            return Response(
                {'error': 'Продукт не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        if 'title' in request.data:
            title = str(request.data.get('title', '')).strip()

            if not title:
                return Response(
                    {'error': 'Название продукта не может быть пустым'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            item.title = title

        if 'is_done' in request.data:
            is_done = bool(request.data.get('is_done'))

            item.is_done = is_done

            if is_done:
                item.completed_by = request.user
                item.completed_at = timezone.now()
            else:
                item.completed_by = None
                item.completed_at = None

        item.save()

        item_data = ShoppingItemSerializer(item).data

        broadcast_activity_update(
            family=family,
            action='update',
            item_type='shopping_item',
            item=item_data,
            item_id=item.id
        )

        return Response(item_data)

    def delete(self, request, item_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted_count, _ = ShoppingItem.objects.filter(
            id=item_id,
            family=family
        ).delete()

        if deleted_count == 0:
            return Response(
                {'error': 'Продукт не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        broadcast_activity_update(
            family=family,
            action='delete',
            item_type='shopping_item',
            item=None,
            item_id=item_id
        )

        return Response({'message': 'Продукт удалён'})