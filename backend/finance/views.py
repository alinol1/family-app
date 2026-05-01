from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from .models import Category, FinanceRecord, FamilyGoal
from .serializers import (
    CategorySerializer,
    FinanceRecordSerializer,
    FamilyGoalSerializer,
)


class CategoryListView(APIView):
    """
    Список всех категорий.
    GET /api/finance/categories/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Можно фильтровать по типу
        record_type = request.query_params.get('type')

        categories = Category.objects.all()

        if record_type:
            categories = categories.filter(category_type=record_type)

        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class FinanceRecordListView(APIView):
    """
    Список финансовых записей семьи.
    GET /api/finance/records/
    POST /api/finance/records/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family
        records = FinanceRecord.objects.filter(family=family)

        # Фильтр по типу
        record_type = request.query_params.get('type')
        if record_type:
            records = records.filter(record_type=record_type)

        serializer = FinanceRecordSerializer(records, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        serializer = FinanceRecordSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(
                created_by=request.user,
                family=family
            )
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class FamilyBalanceView(APIView):
    """
    Баланс семьи.
    GET /api/finance/balance/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family
        records = FinanceRecord.objects.filter(family=family)

        # Считаем доходы
        total_income = records.filter(
            record_type='income'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Считаем расходы
        total_expense = records.filter(
            record_type='expense'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Баланс
        balance = total_income - total_expense

        return Response({
            'balance': balance,
            'total_income': total_income,
            'total_expense': total_expense,
        })


class FinanceStatisticsView(APIView):
    """
    Статистика по категориям.
    GET /api/finance/statistics/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Статистика расходов по категориям
        expenses_by_category = FinanceRecord.objects.filter(
            family=family,
            record_type='expense'
        ).values(
            'category__name',
            'category__icon'
        ).annotate(
            total=Sum('amount')
        ).order_by('-total')

        # Статистика по участникам семьи
        expenses_by_member = FinanceRecord.objects.filter(
            family=family,
            record_type='expense'
        ).values(
            'created_by__first_name',
            'created_by__last_name'
        ).annotate(
            total=Sum('amount')
        ).order_by('-total')

        return Response({
            'by_category': list(expenses_by_category),
            'by_member': list(expenses_by_member),
        })


class FamilyGoalView(APIView):
    """
    Семейная цель.
    GET /api/finance/goal/
    POST /api/finance/goal/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Берём последнюю цель семьи
        goal = FamilyGoal.objects.filter(
            family=family
        ).last()

        if not goal:
            return Response(
                {'error': 'Цель не установлена'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FamilyGoalSerializer(goal)
        return Response(serializer.data)

    def post(self, request):
        # Проверяем: пользователь в семье?
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        serializer = FamilyGoalSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(
                family=family,
                created_by=request.user
            )
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )