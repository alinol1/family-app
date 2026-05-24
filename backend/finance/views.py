from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from families.models import FamilyMember
from users.models import User

from .models import (
    Category,
    FinanceGoal,
    FinanceGoalContribution,
    FinanceRecord,
    FinanceSpace,
    FinanceSpaceMember,
)
from .serializers import (
    CategorySerializer,
    FinanceGoalContributionSerializer,
    FinanceGoalSerializer,
    FinanceRecordSerializer,
    FinanceSpaceSerializer,
    get_user_avatar_url,
    get_user_display_name,
    get_user_initials,
)


DEFAULT_INCOME_CATEGORIES = [
    'Зарплата',
    'Копилка',
    'Подарок',
    'Перевод',
    'Другое',
]

DEFAULT_EXPENSE_CATEGORIES = [
    'Продукты',
    'Автомобиль',
    'Дом',
    'Аптека',
    'Транспорт',
    'Другое',
]


def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def parse_decimal(value):
    try:
        return Decimal(str(value).replace(',', '.'))
    except (InvalidOperation, TypeError, ValueError):
        return None


def parse_date(value):
    if not value:
        return timezone.localdate()

    try:
        return timezone.datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def ensure_default_categories(finance_space, user):
    for title in DEFAULT_INCOME_CATEGORIES:
        Category.objects.get_or_create(
            finance_space=finance_space,
            type='income',
            title=title,
            defaults={
                'created_by': user,
                'is_default': True,
            }
        )

    for title in DEFAULT_EXPENSE_CATEGORIES:
        Category.objects.get_or_create(
            finance_space=finance_space,
            type='expense',
            title=title,
            defaults={
                'created_by': user,
                'is_default': True,
            }
        )


def get_family_users(family):
    return User.objects.filter(
        family_membership__family=family
    ).order_by('first_name', 'username')


def get_or_create_category_by_title(finance_space, user, record_type, title):
    clean_title = str(title or '').strip()

    if not clean_title:
        return None

    category = Category.objects.filter(
        finance_space=finance_space,
        type=record_type,
        title__iexact=clean_title
    ).first()

    if category:
        return category

    return Category.objects.create(
        finance_space=finance_space,
        type=record_type,
        title=clean_title,
        created_by=user,
        is_default=False,
    )


def get_space_for_user(request, space_id):
    family = get_user_family(request.user)

    if not family:
        return None, Response(
            {'error': 'Вы не состоите в семье'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        finance_space = FinanceSpace.objects.prefetch_related(
            'members',
            'goals',
            'categories',
        ).get(
            id=space_id,
            family=family,
            members=request.user,
            is_archived=False,
        )
    except FinanceSpace.DoesNotExist:
        return None, Response(
            {'error': 'Финансовая ячейка не найдена или недоступна'},
            status=status.HTTP_404_NOT_FOUND
        )

    return finance_space, None


def can_manage_space(user, finance_space):
    return user == finance_space.created_by or user == finance_space.family.admin


def build_user_payload(user, request):
    return {
        'id': user.id,
        'name': get_user_display_name(user),
        'initials': get_user_initials(user),
        'avatar_url': get_user_avatar_url(user, request),
        'is_current_user': user.id == request.user.id,
    }


class FinanceFamilyMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = get_family_users(family)

        return Response([
            build_user_payload(user, request)
            for user in users
        ])


class FinanceSpaceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        spaces = FinanceSpace.objects.filter(
            family=family,
            members=request.user,
            is_archived=False,
        ).prefetch_related(
            'members',
            'goals',
        ).order_by('-created_at')

        serializer = FinanceSpaceSerializer(
            spaces,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = str(request.data.get('title', '')).strip()
        space_type = request.data.get('type', 'joint')
        member_ids = request.data.get('member_ids', [])

        if not title:
            return Response(
                {'error': 'Название финансовой ячейки обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if space_type not in ['personal', 'joint', 'collection']:
            return Response(
                {'error': 'Некорректный тип финансовой ячейки'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(member_ids, list):
            member_ids = []

        member_ids = set(member_ids)
        member_ids.add(request.user.id)

        family_user_ids = set(
            get_family_users(family).values_list('id', flat=True)
        )

        invalid_member_ids = member_ids - family_user_ids

        if invalid_member_ids:
            return Response(
                {'error': 'Один или несколько участников не состоят в вашей семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        finance_space = FinanceSpace.objects.create(
            title=title,
            type=space_type,
            family=family,
            created_by=request.user,
        )

        for user_id in member_ids:
            FinanceSpaceMember.objects.create(
                finance_space=finance_space,
                user_id=user_id,
                role='owner' if user_id == request.user.id else 'member',
                added_by=request.user,
            )

        ensure_default_categories(finance_space, request.user)

        serializer = FinanceSpaceSerializer(
            finance_space,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class FinanceSpaceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        serializer = FinanceSpaceSerializer(
            finance_space,
            context={'request': request}
        )

        return Response(serializer.data)

    def patch(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        if not can_manage_space(request.user, finance_space):
            return Response(
                {'error': 'Недостаточно прав для настройки этой ячейки'},
                status=status.HTTP_403_FORBIDDEN
            )

        title = request.data.get('title')
        space_type = request.data.get('type')

        if title is not None:
            clean_title = str(title).strip()

            if not clean_title:
                return Response(
                    {'error': 'Название финансовой ячейки обязательно'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            finance_space.title = clean_title

        if space_type is not None:
            if space_type not in ['personal', 'joint', 'collection']:
                return Response(
                    {'error': 'Некорректный тип финансовой ячейки'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            finance_space.type = space_type

        finance_space.save()

        serializer = FinanceSpaceSerializer(
            finance_space,
            context={'request': request}
        )

        return Response(serializer.data)

    def delete(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        if not can_manage_space(request.user, finance_space):
            return Response(
                {'error': 'Недостаточно прав для удаления этой ячейки'},
                status=status.HTTP_403_FORBIDDEN
            )

        finance_space.is_archived = True
        finance_space.save()

        return Response({'message': 'Финансовая ячейка перенесена в архив'})


class FinanceSpaceMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        selected_ids = set(
            finance_space.members.values_list('id', flat=True)
        )

        users = get_family_users(finance_space.family)

        return Response([
            {
                **build_user_payload(user, request),
                'is_selected': user.id in selected_ids,
            }
            for user in users
        ])

    @transaction.atomic
    def put(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        if not can_manage_space(request.user, finance_space):
            return Response(
                {'error': 'Недостаточно прав для настройки участников'},
                status=status.HTTP_403_FORBIDDEN
            )

        member_ids = request.data.get('member_ids', [])

        if not isinstance(member_ids, list):
            return Response(
                {'error': 'member_ids должен быть списком'},
                status=status.HTTP_400_BAD_REQUEST
            )

        member_ids = set(member_ids)
        member_ids.add(finance_space.created_by_id)

        family_user_ids = set(
            get_family_users(finance_space.family).values_list('id', flat=True)
        )

        invalid_member_ids = member_ids - family_user_ids

        if invalid_member_ids:
            return Response(
                {'error': 'Один или несколько участников не состоят в вашей семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        FinanceSpaceMember.objects.filter(
            finance_space=finance_space
        ).exclude(
            user_id__in=member_ids
        ).delete()

        existing_ids = set(
            FinanceSpaceMember.objects.filter(
                finance_space=finance_space
            ).values_list('user_id', flat=True)
        )

        for user_id in member_ids - existing_ids:
            FinanceSpaceMember.objects.create(
                finance_space=finance_space,
                user_id=user_id,
                role='owner' if user_id == finance_space.created_by_id else 'member',
                added_by=request.user,
            )

        serializer = FinanceSpaceSerializer(
            finance_space,
            context={'request': request}
        )

        return Response(serializer.data)


class CategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        ensure_default_categories(finance_space, request.user)

        category_type = request.query_params.get('type')

        categories = Category.objects.filter(finance_space=finance_space)

        if category_type in ['income', 'expense']:
            categories = categories.filter(type=category_type)

        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    def post(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

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

        category, created = Category.objects.get_or_create(
            finance_space=finance_space,
            type=category_type,
            title=title,
            defaults={
                'created_by': request.user,
                'is_default': False,
            }
        )

        if not created:
            return Response(
                {'error': 'Такая категория уже существует'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CategorySerializer(category)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_category(self, request, space_id, category_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return None, error_response

        try:
            category = Category.objects.get(
                id=category_id,
                finance_space=finance_space
            )
        except Category.DoesNotExist:
            return None, Response(
                {'error': 'Категория не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        return category, None

    def patch(self, request, space_id, category_id):
        category, error_response = self.get_category(
            request,
            space_id,
            category_id
        )

        if error_response:
            return error_response

        title = str(request.data.get('title', category.title)).strip()
        category_type = request.data.get('type', category.type)

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

        category.title = title
        category.type = category_type
        category.is_default = False
        category.save()

        serializer = CategorySerializer(category)
        return Response(serializer.data)

    def delete(self, request, space_id, category_id):
        category, error_response = self.get_category(
            request,
            space_id,
            category_id
        )

        if error_response:
            return error_response

        if category.is_default:
            return Response(
                {'error': 'Стандартную категорию нельзя удалить'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category.delete()

        return Response({'message': 'Категория удалена'})


class FinanceRecordListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        record_type = request.query_params.get('type')

        records = FinanceRecord.objects.filter(
            finance_space=finance_space
        ).select_related(
            'category',
            'created_by'
        )

        if record_type in ['income', 'expense']:
            records = records.filter(type=record_type)

        serializer = FinanceRecordSerializer(
            records,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    def post(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        record_type = request.data.get('type')
        amount = parse_decimal(request.data.get('amount'))
        title = str(request.data.get('title', '')).strip()
        description = str(request.data.get('description', '')).strip()
        record_date = parse_date(request.data.get('date'))

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
                    finance_space=finance_space,
                    type=record_type
                )
            except Category.DoesNotExist:
                return Response(
                    {'error': 'Категория не найдена'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif category_title:
            category = get_or_create_category_by_title(
                finance_space=finance_space,
                user=request.user,
                record_type=record_type,
                title=category_title
            )

        if not title:
            title = category.title if category else 'Операция'

        record = FinanceRecord.objects.create(
            title=title,
            type=record_type,
            amount=amount,
            category=category,
            description=description,
            date=record_date,
            finance_space=finance_space,
            created_by=request.user,
        )

        serializer = FinanceRecordSerializer(
            record,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class FinanceRecordDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_record(self, request, space_id, record_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return None, error_response

        try:
            record = FinanceRecord.objects.select_related(
                'category',
                'created_by'
            ).get(
                id=record_id,
                finance_space=finance_space
            )
        except FinanceRecord.DoesNotExist:
            return None, Response(
                {'error': 'Операция не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        return record, None

    def get(self, request, space_id, record_id):
        record, error_response = self.get_record(
            request,
            space_id,
            record_id
        )

        if error_response:
            return error_response

        serializer = FinanceRecordSerializer(
            record,
            context={'request': request}
        )

        return Response(serializer.data)

    def patch(self, request, space_id, record_id):
        record, error_response = self.get_record(
            request,
            space_id,
            record_id
        )

        if error_response:
            return error_response

        if 'type' in request.data:
            record_type = request.data.get('type')

            if record_type not in ['income', 'expense']:
                return Response(
                    {'error': 'Некорректный тип операции'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record.type = record_type

        if 'amount' in request.data:
            amount = parse_decimal(request.data.get('amount'))

            if amount is None or amount <= 0:
                return Response(
                    {'error': 'Введите корректную сумму'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            record.amount = amount

        if 'title' in request.data:
            record.title = str(request.data.get('title', '')).strip()

        if 'description' in request.data:
            record.description = str(
                request.data.get('description', '')
            ).strip()

        if 'date' in request.data:
            record_date = parse_date(request.data.get('date'))

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
                        finance_space=record.finance_space,
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

        if 'category_title' in request.data:
            category_title = request.data.get('category_title')

            if category_title:
                category = get_or_create_category_by_title(
                    finance_space=record.finance_space,
                    user=request.user,
                    record_type=record.type,
                    title=category_title
                )

                record.category = category

        record.save()

        serializer = FinanceRecordSerializer(
            record,
            context={'request': request}
        )

        return Response(serializer.data)

    def delete(self, request, space_id, record_id):
        record, error_response = self.get_record(
            request,
            space_id,
            record_id
        )

        if error_response:
            return error_response

        record.delete()

        return Response({'message': 'Операция удалена'})


class FinanceGoalListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        status_filter = request.query_params.get('status')

        goals = FinanceGoal.objects.filter(
            finance_space=finance_space
        ).prefetch_related(
            'members',
            'contributions',
        )

        if status_filter in ['active', 'completed']:
            goals = goals.filter(status=status_filter)

        serializer = FinanceGoalSerializer(
            goals,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    def post(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        title = str(request.data.get('title', '')).strip()
        description = str(request.data.get('description', '')).strip()
        scope = request.data.get('scope', 'personal')
        target_amount = parse_decimal(request.data.get('target_amount'))
        member_ids = request.data.get('member_ids', [])

        if not title:
            return Response(
                {'error': 'Название цели обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if scope not in ['personal', 'family']:
            return Response(
                {'error': 'Некорректный тип цели'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if target_amount is None or target_amount <= 0:
            return Response(
                {'error': 'Введите корректную сумму цели'},
                status=status.HTTP_400_BAD_REQUEST
            )

        goal = FinanceGoal.objects.create(
            title=title,
            description=description,
            scope=scope,
            target_amount=target_amount,
            current_amount=0,
            finance_space=finance_space,
            created_by=request.user,
        )

        if scope == 'personal':
            goal.members.set([request.user])
        else:
            if not isinstance(member_ids, list) or not member_ids:
                member_ids = list(
                    finance_space.members.values_list('id', flat=True)
                )

            allowed_ids = set(
                finance_space.members.values_list('id', flat=True)
            )

            member_ids = set(member_ids)

            if member_ids - allowed_ids:
                goal.delete()
                return Response(
                    {'error': 'Участник цели должен иметь доступ к финансовой ячейке'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            goal.members.set(member_ids)

        serializer = FinanceGoalSerializer(
            goal,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class FinanceGoalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_goal(self, request, space_id, goal_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return None, error_response

        try:
            goal = FinanceGoal.objects.prefetch_related(
                'members',
                'contributions',
            ).get(
                id=goal_id,
                finance_space=finance_space
            )
        except FinanceGoal.DoesNotExist:
            return None, Response(
                {'error': 'Цель не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        return goal, None

    def get(self, request, space_id, goal_id):
        goal, error_response = self.get_goal(
            request,
            space_id,
            goal_id
        )

        if error_response:
            return error_response

        serializer = FinanceGoalSerializer(
            goal,
            context={'request': request}
        )

        return Response(serializer.data)

    def patch(self, request, space_id, goal_id):
        goal, error_response = self.get_goal(
            request,
            space_id,
            goal_id
        )

        if error_response:
            return error_response

        if 'title' in request.data:
            title = str(request.data.get('title', '')).strip()

            if not title:
                return Response(
                    {'error': 'Название цели обязательно'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            goal.title = title

        if 'description' in request.data:
            goal.description = str(
                request.data.get('description', '')
            ).strip()

        if 'scope' in request.data:
            scope = request.data.get('scope')

            if scope not in ['personal', 'family']:
                return Response(
                    {'error': 'Некорректный тип цели'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            goal.scope = scope

        if 'target_amount' in request.data:
            target_amount = parse_decimal(
                request.data.get('target_amount')
            )

            if target_amount is None or target_amount <= 0:
                return Response(
                    {'error': 'Введите корректную сумму цели'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            goal.target_amount = target_amount

        if 'current_amount' in request.data:
            current_amount = parse_decimal(
                request.data.get('current_amount')
            )

            if current_amount is None or current_amount < 0:
                return Response(
                    {'error': 'Введите корректную накопленную сумму'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            goal.current_amount = current_amount

        goal.save()

        if 'member_ids' in request.data:
            member_ids = request.data.get('member_ids', [])

            if goal.scope == 'personal':
                goal.members.set([request.user])
            else:
                if not isinstance(member_ids, list):
                    return Response(
                        {'error': 'member_ids должен быть списком'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                allowed_ids = set(
                    goal.finance_space.members.values_list('id', flat=True)
                )

                member_ids = set(member_ids)

                if member_ids - allowed_ids:
                    return Response(
                        {'error': 'Участник цели должен иметь доступ к финансовой ячейке'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                goal.members.set(member_ids)

        serializer = FinanceGoalSerializer(
            goal,
            context={'request': request}
        )

        return Response(serializer.data)

    def delete(self, request, space_id, goal_id):
        goal, error_response = self.get_goal(
            request,
            space_id,
            goal_id
        )

        if error_response:
            return error_response

        goal.delete()

        return Response({'message': 'Цель удалена'})


class FinanceGoalCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, space_id, goal_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        try:
            goal = FinanceGoal.objects.get(
                id=goal_id,
                finance_space=finance_space
            )
        except FinanceGoal.DoesNotExist:
            return Response(
                {'error': 'Цель не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        if goal.current_amount < goal.target_amount:
            return Response(
                {'error': 'Цель ещё не достигла 100%'},
                status=status.HTTP_400_BAD_REQUEST
            )

        goal.status = 'completed'
        goal.completed_at = timezone.now()
        goal.save()

        serializer = FinanceGoalSerializer(
            goal,
            context={'request': request}
        )

        return Response(serializer.data)


class FinanceGoalContributionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id, goal_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        try:
            goal = FinanceGoal.objects.get(
                id=goal_id,
                finance_space=finance_space
            )
        except FinanceGoal.DoesNotExist:
            return Response(
                {'error': 'Цель не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        contributions = FinanceGoalContribution.objects.filter(goal=goal)

        serializer = FinanceGoalContributionSerializer(
            contributions,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)

    @transaction.atomic
    def post(self, request, space_id, goal_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        try:
            goal = FinanceGoal.objects.select_for_update().get(
                id=goal_id,
                finance_space=finance_space
            )
        except FinanceGoal.DoesNotExist:
            return Response(
                {'error': 'Цель не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        if goal.status == 'completed':
            return Response(
                {'error': 'Выполненную цель нельзя пополнять'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount = parse_decimal(request.data.get('amount'))
        comment = str(request.data.get('comment', '')).strip()

        if amount is None or amount <= 0:
            return Response(
                {'error': 'Введите корректную сумму пополнения'},
                status=status.HTTP_400_BAD_REQUEST
            )

        contribution = FinanceGoalContribution.objects.create(
            goal=goal,
            amount=amount,
            comment=comment,
            created_by=request.user,
        )

        goal.current_amount += amount
        goal.save()

        return Response(
            {
                'goal': FinanceGoalSerializer(
                    goal,
                    context={'request': request}
                ).data,
                'contribution': FinanceGoalContributionSerializer(
                    contribution,
                    context={'request': request}
                ).data,
            },
            status=status.HTTP_201_CREATED
        )


class FinanceSpaceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        return Response({
            'income': finance_space.income_total,
            'expense': finance_space.expense_total,
            'balance': finance_space.balance,
            'active_goals_count': finance_space.goals.filter(status='active').count(),
            'completed_goals_count': finance_space.goals.filter(status='completed').count(),
        })


class FinanceSpaceStatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, space_id):
        finance_space, error_response = get_space_for_user(request, space_id)

        if error_response:
            return error_response

        records = FinanceRecord.objects.filter(
            finance_space=finance_space
        ).select_related(
            'category',
            'created_by'
        )

        income_records = records.filter(type='income')
        expense_records = records.filter(type='expense')

        total_income = income_records.aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        total_expense = expense_records.aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        net_amount = total_income - total_expense

        expense_load_percent = 0
        saving_percent = 0

        if total_income > 0:
            expense_load_percent = min(
                round((total_expense / total_income) * 100),
                100
            )
            saving_percent = max(
                round((net_amount / total_income) * 100),
                0
            )

        income_count = income_records.count()
        expense_count = expense_records.count()

        average_income = total_income / income_count if income_count else Decimal('0')
        average_expense = total_expense / expense_count if expense_count else Decimal('0')

        income_categories = {}
        expense_categories = {}
        actors = {}

        for record in records:
            category_title = record.category.title if record.category else 'Без категории'

            if record.type == 'income':
                income_categories[category_title] = (
                    income_categories.get(category_title, Decimal('0')) + record.amount
                )
            else:
                expense_categories[category_title] = (
                    expense_categories.get(category_title, Decimal('0')) + record.amount
                )

            actor_key = record.created_by_id

            if actor_key not in actors:
                actors[actor_key] = {
                    'id': record.created_by.id,
                    'name': get_user_display_name(record.created_by),
                    'initials': get_user_initials(record.created_by),
                    'income': Decimal('0'),
                    'expense': Decimal('0'),
                }

            actors[actor_key][record.type] += record.amount

        def build_category_stats(items, total):
            result = []

            for title, amount in items.items():
                percent = round((amount / total) * 100) if total > 0 else 0

                result.append({
                    'title': title,
                    'amount': amount,
                    'percent': percent,
                })

            return sorted(
                result,
                key=lambda item: item['amount'],
                reverse=True
            )

        today = timezone.localdate()
        start_date = today - timedelta(days=27)

        period_stats = [
            {'label': '1 нед', 'income': Decimal('0'), 'expense': Decimal('0')},
            {'label': '2 нед', 'income': Decimal('0'), 'expense': Decimal('0')},
            {'label': '3 нед', 'income': Decimal('0'), 'expense': Decimal('0')},
            {'label': '4 нед', 'income': Decimal('0'), 'expense': Decimal('0')},
        ]

        for record in records.filter(date__gte=start_date):
            day_index = (record.date - start_date).days
            period_index = min(day_index // 7, 3)

            period_stats[period_index][record.type] += record.amount

        active_goals = finance_space.goals.filter(status='active')

        goals_current_amount = active_goals.aggregate(
            total=Coalesce(Sum('current_amount'), Decimal('0'))
        )['total']

        goals_target_amount = active_goals.aggregate(
            total=Coalesce(Sum('target_amount'), Decimal('0'))
        )['total']

        goals_progress_percent = 0

        if goals_target_amount > 0:
            goals_progress_percent = min(
                round((goals_current_amount / goals_target_amount) * 100),
                100
            )

        largest_expense = expense_records.order_by('-amount').first()

        return Response({
            'total_income': total_income,
            'total_expense': total_expense,
            'net_amount': net_amount,
            'income_operations_count': income_count,
            'expense_operations_count': expense_count,
            'expense_load_percent': expense_load_percent,
            'saving_percent': saving_percent,
            'average_income': average_income,
            'average_expense': average_expense,
            'income_category_stats': build_category_stats(
                income_categories,
                total_income
            ),
            'expense_category_stats': build_category_stats(
                expense_categories,
                total_expense
            ),
            'actor_stats': sorted(
                actors.values(),
                key=lambda item: item['income'] + item['expense'],
                reverse=True
            ),
            'period_stats': period_stats,
            'goals_current_amount': goals_current_amount,
            'goals_target_amount': goals_target_amount,
            'goals_progress_percent': goals_progress_percent,
            'largest_expense': FinanceRecordSerializer(
                largest_expense,
                context={'request': request}
            ).data if largest_expense else None,
        })