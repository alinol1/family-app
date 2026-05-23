from decimal import Decimal, InvalidOperation
from datetime import date

from django.db.models import Sum
from django.db.models.functions import Coalesce

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Category, FinanceRecord, FamilyGoal
from .serializers import (
    CategorySerializer,
    FinanceRecordSerializer,
    FamilyGoalSerializer,
)


DEFAULT_INCOME_CATEGORIES = [
    'Зарплата',
    'Подарок',
    'Подработка',
    'Возврат',
    'Другое',
]

DEFAULT_EXPENSE_CATEGORIES = [
    'Продукты',
    'Транспорт',
    'Медицина',
    'Дом',
    'Развлечения',
    'Образование',
    'Копилка',
    'Другое',
]


def get_user_family(user):
    """
    Возвращает семью пользователя.
    """
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def parse_decimal(value):
    """
    Безопасно преобразует значение в Decimal.
    """
    try:
        return Decimal(str(value).replace(',', '.'))
    except (InvalidOperation, TypeError, ValueError):
        return None


def parse_record_date(value):
    """
    Безопасно преобразует дату.
    Если дата не передана — возвращает сегодняшнюю дату.
    """
    if not value:
        return date.today()

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None


def ensure_default_categories(family, user):
    """
    Создаёт стандартные категории доходов и расходов,
    если их ещё нет у семьи.
    """
    for title in DEFAULT_INCOME_CATEGORIES:
        Category.objects.get_or_create(
            family=family,
            type='income',
            title=title,
            defaults={
                'created_by': user,
                'is_default': True,
            }
        )

    for title in DEFAULT_EXPENSE_CATEGORIES:
        Category.objects.get_or_create(
            family=family,
            type='expense',
            title=title,
            defaults={
                'created_by': user,
                'is_default': True,
            }
        )


def get_or_create_category_by_title(family, user, record_type, title):
    """
    Получает категорию по названию или создаёт новую.
    Это нужно, чтобы frontend мог отправлять category_title.
    """
    clean_title = str(title or '').strip()

    if not clean_title:
        return None

    existing_category = Category.objects.filter(
        family=family,
        type=record_type,
        title__iexact=clean_title
    ).first()

    if existing_category:
        return existing_category

    return Category.objects.create(
        family=family,
        type=record_type,
        title=clean_title,
        created_by=user,
        is_default=False,
    )


def is_piggy_bank_record(record):
    """
    Проверяет, является ли операция расходом в категорию 'Копилка'.
    """
    if not record:
        return False

    if record.type != 'expense':
        return False

    if not record.category:
        return False

    return record.category.title.strip().lower() == 'копилка'


def get_or_create_family_goal(family, user):
    """
    Возвращает финансовую цель семьи.
    Если цели ещё нет — создаёт стандартную.
    """
    goal, created = FamilyGoal.objects.get_or_create(
        family=family,
        defaults={
            'title': 'Семейная цель',
            'current_amount': 0,
            'target_amount': 100000,
            'created_by': user,
        }
    )

    return goal


def apply_goal_delta(family, user, delta):
    """
    Изменяет накопленную сумму семейной цели.

    delta > 0 — пополнение цели.
    delta < 0 — уменьшение цели.
    """
    if delta == 0:
        return None

    goal = get_or_create_family_goal(family, user)

    new_current_amount = goal.current_amount + delta

    if new_current_amount < 0:
        new_current_amount = Decimal('0')

    goal.current_amount = new_current_amount
    goal.save()

    return goal


def get_piggy_bank_contribution(record):
    """
    Возвращает сумму, которая должна влиять на цель.
    Если операция не относится к копилке — 0.
    """
    if is_piggy_bank_record(record):
        return record.amount

    return Decimal('0')


class CategoryListCreateView(APIView):
    """
    Категории финансов.

    GET  /api/finance/categories/
    GET  /api/finance/categories/?type=income
    GET  /api/finance/categories/?type=expense
    POST /api/finance/categories/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ensure_default_categories(family, request.user)

        category_type = request.query_params.get('type')

        categories = Category.objects.filter(family=family)

        if category_type in ['income', 'expense']:
            categories = categories.filter(type=category_type)

        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = str(request.data.get('title', '')).strip()
        category_type = request.data.get('type')

        if not title:
            return Response(
                {'error': 'Название категории обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if category_type not in ['income', 'expense']:
            return Response(
                {'error': 'Некорректный тип категории'},
                status=status.HTTP_400_BAD_REQUEST
            )

        existing_category = Category.objects.filter(
            family=family,
            type=category_type,
            title__iexact=title
        ).first()

        if existing_category:
            return Response(
                {'error': 'Такая категория уже существует'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category = Category.objects.create(
            title=title,
            type=category_type,
            family=family,
            created_by=request.user,
            is_default=False,
        )

        serializer = CategorySerializer(category)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class CategoryDetailView(APIView):
    """
    Редактирование и удаление категории.

    PATCH  /api/finance/categories/<category_id>/
    DELETE /api/finance/categories/<category_id>/
    """

    permission_classes = [IsAuthenticated]

    def get_category(self, request, category_id):
        family = get_user_family(request.user)

        if not family:
            return None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            category = Category.objects.get(
                id=category_id,
                family=family
            )
        except Category.DoesNotExist:
            return None, Response(
                {'error': 'Категория не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        return category, None

    def patch(self, request, category_id):
        category, error_response = self.get_category(request, category_id)

        if error_response:
            return error_response

        title = str(request.data.get('title', '')).strip()

        if not title:
            return Response(
                {'error': 'Название категории обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        duplicate = Category.objects.filter(
            family=category.family,
            type=category.type,
            title__iexact=title
        ).exclude(id=category.id).exists()

        if duplicate:
            return Response(
                {'error': 'Такая категория уже существует'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category.title = title
        category.save()

        serializer = CategorySerializer(category)
        return Response(serializer.data)

    def delete(self, request, category_id):
        category, error_response = self.get_category(request, category_id)

        if error_response:
            return error_response

        if category.is_default:
            return Response(
                {'error': 'Стандартную категорию нельзя удалить'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category.delete()

        return Response(
            {'message': 'Категория удалена'},
            status=status.HTTP_200_OK
        )


class FinanceRecordListCreateView(APIView):
    """
    Список финансовых операций и создание операции.

    GET  /api/finance/records/
    POST /api/finance/records/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        record_type = request.query_params.get('type')

        records = FinanceRecord.objects.filter(
            family=family
        ).select_related(
            'category',
            'created_by'
        ).order_by('-date', '-created_at')

        if record_type in ['income', 'expense']:
            records = records.filter(type=record_type)

        serializer = FinanceRecordSerializer(records, many=True)
        return Response(serializer.data)

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ensure_default_categories(family, request.user)

        record_type = request.data.get('type')
        amount = parse_decimal(request.data.get('amount'))
        description = str(request.data.get('description', '')).strip()
        record_date = parse_record_date(request.data.get('date'))

        if record_type not in ['income', 'expense']:
            return Response(
                {'error': 'Некорректный тип операции'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if amount is None or amount <= 0:
            return Response(
                {'error': 'Введите корректную сумму'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if record_date is None:
            return Response(
                {'error': 'Некорректная дата операции'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category = None

        category_id = request.data.get('category')
        category_title = request.data.get('category_title')

        if category_id:
            try:
                category = Category.objects.get(
                    id=category_id,
                    family=family,
                    type=record_type
                )
            except Category.DoesNotExist:
                return Response(
                    {'error': 'Категория не найдена'},
                    status=status.HTTP_404_NOT_FOUND
                )

        elif category_title:
            category = get_or_create_category_by_title(
                family=family,
                user=request.user,
                record_type=record_type,
                title=category_title
            )

        record = FinanceRecord.objects.create(
            type=record_type,
            amount=amount,
            category=category,
            description=description,
            date=record_date,
            family=family,
            created_by=request.user,
        )

        if is_piggy_bank_record(record):
            apply_goal_delta(
                family=family,
                user=request.user,
                delta=record.amount
            )

        serializer = FinanceRecordSerializer(record)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class FinanceRecordDetailView(APIView):
    """
    Просмотр, редактирование и удаление операции.

    GET    /api/finance/records/<record_id>/
    PATCH  /api/finance/records/<record_id>/
    DELETE /api/finance/records/<record_id>/
    """

    permission_classes = [IsAuthenticated]

    def get_record(self, request, record_id):
        family = get_user_family(request.user)

        if not family:
            return None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            record = FinanceRecord.objects.select_related(
                'category',
                'family',
                'created_by'
            ).get(
                id=record_id,
                family=family
            )
        except FinanceRecord.DoesNotExist:
            return None, Response(
                {'error': 'Операция не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        return record, None

    def get(self, request, record_id):
        record, error_response = self.get_record(request, record_id)

        if error_response:
            return error_response

        serializer = FinanceRecordSerializer(record)
        return Response(serializer.data)

    def patch(self, request, record_id):
        record, error_response = self.get_record(request, record_id)

        if error_response:
            return error_response

        old_contribution = get_piggy_bank_contribution(record)
        type_changed = False

        if 'type' in request.data:
            record_type = request.data.get('type')

            if record_type not in ['income', 'expense']:
                return Response(
                    {'error': 'Некорректный тип операции'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if record.type != record_type:
                type_changed = True

            record.type = record_type

        if 'amount' in request.data:
            amount = parse_decimal(request.data.get('amount'))

            if amount is None or amount <= 0:
                return Response(
                    {'error': 'Введите корректную сумму'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record.amount = amount

        if 'description' in request.data:
            record.description = str(
                request.data.get('description', '')
            ).strip()

        if 'date' in request.data:
            record_date = parse_record_date(request.data.get('date'))

            if record_date is None:
                return Response(
                    {'error': 'Некорректная дата операции'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record.date = record_date

        if 'category' in request.data:
            category_id = request.data.get('category')

            if category_id:
                try:
                    category = Category.objects.get(
                        id=category_id,
                        family=record.family,
                        type=record.type
                    )
                except Category.DoesNotExist:
                    return Response(
                        {'error': 'Категория не найдена'},
                        status=status.HTTP_404_NOT_FOUND
                    )

                record.category = category
            else:
                record.category = None

        elif 'category_title' in request.data:
            category_title = request.data.get('category_title')

            if category_title:
                category = get_or_create_category_by_title(
                    family=record.family,
                    user=request.user,
                    record_type=record.type,
                    title=category_title
                )

                record.category = category
            else:
                record.category = None

        elif type_changed and record.category and record.category.type != record.type:
            record.category = None

        record.save()

        new_contribution = get_piggy_bank_contribution(record)
        contribution_delta = new_contribution - old_contribution

        if contribution_delta != 0:
            apply_goal_delta(
                family=record.family,
                user=request.user,
                delta=contribution_delta
            )

        serializer = FinanceRecordSerializer(record)
        return Response(serializer.data)

    def delete(self, request, record_id):
        record, error_response = self.get_record(request, record_id)

        if error_response:
            return error_response

        contribution = get_piggy_bank_contribution(record)

        if contribution > 0:
            apply_goal_delta(
                family=record.family,
                user=request.user,
                delta=-contribution
            )

        record.delete()

        return Response(
            {'message': 'Операция удалена'},
            status=status.HTTP_200_OK
        )


class FamilyGoalView(APIView):
    """
    Семейная финансовая цель.

    GET   /api/finance/goal/
    PATCH /api/finance/goal/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        goal = get_or_create_family_goal(
            family=family,
            user=request.user
        )

        serializer = FamilyGoalSerializer(goal)
        return Response(serializer.data)

    def patch(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        goal = get_or_create_family_goal(
            family=family,
            user=request.user
        )

        title = str(request.data.get('title', goal.title)).strip()
        current_amount = parse_decimal(
            request.data.get('current_amount', goal.current_amount)
        )
        target_amount = parse_decimal(
            request.data.get('target_amount', goal.target_amount)
        )

        if not title:
            return Response(
                {'error': 'Название цели обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_amount is None or current_amount < 0:
            return Response(
                {'error': 'Некорректная накопленная сумма'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if target_amount is None or target_amount <= 0:
            return Response(
                {'error': 'Некорректная целевая сумма'},
                status=status.HTTP_400_BAD_REQUEST
            )

        goal.title = title
        goal.current_amount = current_amount
        goal.target_amount = target_amount
        goal.save()

        serializer = FamilyGoalSerializer(goal)
        return Response(serializer.data)


class FinanceSummaryView(APIView):
    """
    Общая финансовая сводка.

    GET /api/finance/summary/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        income = FinanceRecord.objects.filter(
            family=family,
            type='income'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        expense = FinanceRecord.objects.filter(
            family=family,
            type='expense'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        balance = income - expense

        return Response({
            'income': income,
            'expense': expense,
            'balance': balance,
        })


class FinanceStatisticsView(APIView):
    """
    Статистика по финансам.

    GET /api/finance/statistics/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        income = FinanceRecord.objects.filter(
            family=family,
            type='income'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        expense = FinanceRecord.objects.filter(
            family=family,
            type='expense'
        ).aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        expense_by_category_raw = FinanceRecord.objects.filter(
            family=family,
            type='expense'
        ).values(
            'category__title'
        ).annotate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        ).order_by('-total')

        expense_by_category = []

        for item in expense_by_category_raw:
            category_title = item['category__title'] or 'Без категории'
            total = item['total']
            percent = Decimal('0')

            if expense > 0:
                percent = round((total / expense) * 100, 2)

            expense_by_category.append({
                'category': category_title,
                'amount': total,
                'percent': percent,
            })

        top_category = expense_by_category[0] if expense_by_category else None

        goal = FamilyGoal.objects.filter(family=family).first()
        goal_data = FamilyGoalSerializer(goal).data if goal else None

        return Response({
            'income': income,
            'expense': expense,
            'balance': income - expense,
            'expense_by_category': expense_by_category,
            'top_expense_category': top_category,
            'goal': goal_data,
        })