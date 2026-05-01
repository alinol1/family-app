from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Family, FamilyMember
from .serializers import (
    FamilySerializer,
    CreateFamilySerializer,
    JoinFamilySerializer,
)


class CreateFamilyView(APIView):
    """
    Создание новой семьи.
    POST /api/families/create/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Проверяем: пользователь уже в семье?
        if hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы уже состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreateFamilySerializer(data=request.data)

        if serializer.is_valid():
            # Создаём семью
            family = Family.objects.create(
                name=serializer.validated_data['name'],
                admin=request.user
            )

            # Добавляем создателя как участника
            FamilyMember.objects.create(
                user=request.user,
                family=family
            )

            # Меняем роль пользователя на администратора
            request.user.role = 'admin'
            request.user.save()

            return Response(
                FamilySerializer(family).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class JoinFamilyView(APIView):
    """
    Присоединение к семье по коду.
    POST /api/families/join/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Проверяем: пользователь уже в семье?
        if hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы уже состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = JoinFamilySerializer(data=request.data)

        if serializer.is_valid():
            invite_code = serializer.validated_data['invite_code']

            # Ищем семью по коду
            try:
                family = Family.objects.get(invite_code=invite_code)
            except Family.DoesNotExist:
                return Response(
                    {'error': 'Неверный код приглашения'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Добавляем пользователя в семью
            FamilyMember.objects.create(
                user=request.user,
                family=family
            )

            return Response(
                FamilySerializer(family).data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class FamilyDetailView(APIView):
    """
    Информация о своей семье.
    GET /api/families/my/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_404_NOT_FOUND
            )

        family = request.user.family_membership.family
        serializer = FamilySerializer(family)
        return Response(serializer.data)


class LeaveFamilyView(APIView):
    """
    Выход из семьи.
    POST /api/families/leave/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership = request.user.family_membership
        family = membership.family

        # Администратор не может покинуть семью
        if family.admin == request.user:
            return Response(
                {'error': 'Администратор не может покинуть семью'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Удаляем участника
        membership.delete()

        # Меняем роль обратно на adult
        request.user.role = 'adult'
        request.user.save()

        return Response(
            {'message': 'Вы вышли из семьи'},
            status=status.HTTP_200_OK
        )


class RemoveMemberView(APIView):
    """
    Удаление участника из семьи (только для администратора).
    DELETE /api/families/members/<user_id>/
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        # Проверяем: пользователь администратор?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        if family.admin != request.user:
            return Response(
                {'error': 'Только администратор может удалять участников'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Нельзя удалить самого себя
        if request.user.id == user_id:
            return Response(
                {'error': 'Нельзя удалить самого себя'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ищем участника
        try:
            membership = FamilyMember.objects.get(
                family=family,
                user_id=user_id
            )
        except FamilyMember.DoesNotExist:
            return Response(
                {'error': 'Участник не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        membership.delete()

        return Response(
            {'message': 'Участник удалён из семьи'},
            status=status.HTTP_200_OK
        )