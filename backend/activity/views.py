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

        return Response(
            FamilyTaskSerializer(task).data,
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

        return Response(FamilyTaskSerializer(task).data)

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

        return Response(
            ShoppingItemSerializer(item).data,
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

        return Response(ShoppingItemSerializer(item).data)

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

        return Response({'message': 'Продукт удалён'})