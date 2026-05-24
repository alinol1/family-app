from rest_framework import serializers

from .models import (
    Category,
    FinanceGoal,
    FinanceGoalContribution,
    FinanceRecord,
    FinanceSpace,
)


def get_user_display_name(user):
    name = f'{user.first_name} {user.last_name}'.strip()
    return name or user.username


def get_user_initials(user):
    display_name = get_user_display_name(user)

    words = display_name.split()

    if len(words) >= 2:
        return f'{words[0][0]}{words[1][0]}'.upper()

    return display_name[:1].upper()


def get_user_avatar_url(user, request=None):
    if not user.avatar:
        return None

    url = user.avatar.url

    if request:
        return request.build_absolute_uri(url)

    return url


class FinanceUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    initials = serializers.CharField()
    avatar_url = serializers.CharField(allow_null=True)
    is_current_user = serializers.BooleanField()


class FinanceSpaceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )

    members = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    access_text = serializers.SerializerMethodField()

    income = serializers.SerializerMethodField()
    expense = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    goals_count = serializers.SerializerMethodField()
    completed_goals_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FinanceSpace
        fields = [
            'id',
            'title',
            'type',
            'type_display',
            'family',
            'created_by',
            'created_by_name',
            'members',
            'members_count',
            'access_text',
            'income',
            'expense',
            'balance',
            'goals_count',
            'completed_goals_count',
            'is_archived',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'family',
            'created_by',
            'created_by_name',
            'members',
            'members_count',
            'access_text',
            'income',
            'expense',
            'balance',
            'goals_count',
            'completed_goals_count',
            'is_archived',
            'created_at',
            'updated_at',
        ]

    def get_members(self, obj):
        request = self.context.get('request')
        current_user = request.user if request else None

        return [
            {
                'id': user.id,
                'name': get_user_display_name(user),
                'initials': get_user_initials(user),
                'avatar_url': get_user_avatar_url(user, request),
                'is_current_user': current_user and user.id == current_user.id,
            }
            for user in obj.members.all()
        ]

    def get_members_count(self, obj):
        return obj.members.count()

    def get_access_text(self, obj):
        names = [
            get_user_display_name(user)
            for user in obj.members.all()[:4]
        ]

        return ' + '.join(names)

    def get_income(self, obj):
        return obj.income_total

    def get_expense(self, obj):
        return obj.expense_total

    def get_balance(self, obj):
        return obj.balance

    def get_goals_count(self, obj):
        return obj.goals.filter(status='active').count()

    def get_completed_goals_count(self, obj):
        return obj.goals.filter(status='completed').count()

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)


class CategorySerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id',
            'title',
            'type',
            'type_display',
            'finance_space',
            'created_by',
            'created_by_name',
            'is_default',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'finance_space',
            'created_by',
            'created_by_name',
            'is_default',
            'created_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)


class FinanceRecordSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )

    category_title = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()
    actor_avatar_url = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()

    class Meta:
        model = FinanceRecord
        fields = [
            'id',
            'title',
            'type',
            'type_display',
            'amount',
            'category',
            'category_title',
            'description',
            'date',
            'finance_space',
            'created_by',
            'created_by_name',
            'actor_initials',
            'actor_avatar_url',
            'subtitle',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'type_display',
            'category_title',
            'finance_space',
            'created_by',
            'created_by_name',
            'actor_initials',
            'actor_avatar_url',
            'subtitle',
            'created_at',
            'updated_at',
        ]

    def get_category_title(self, obj):
        if obj.category:
            return obj.category.title

        return 'Без категории'

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)

    def get_actor_initials(self, obj):
        return get_user_initials(obj.created_by)

    def get_actor_avatar_url(self, obj):
        request = self.context.get('request')
        return get_user_avatar_url(obj.created_by, request)

    def get_subtitle(self, obj):
        return f'{obj.date.strftime("%d.%m.%Y")} · {get_user_display_name(obj.created_by)}'


class FinanceGoalContributionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()
    actor_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = FinanceGoalContribution
        fields = [
            'id',
            'goal',
            'amount',
            'comment',
            'created_by',
            'created_by_name',
            'actor_initials',
            'actor_avatar_url',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'goal',
            'created_by',
            'created_by_name',
            'actor_initials',
            'actor_avatar_url',
            'created_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)

    def get_actor_initials(self, obj):
        return get_user_initials(obj.created_by)

    def get_actor_avatar_url(self, obj):
        request = self.context.get('request')
        return get_user_avatar_url(obj.created_by, request)


class FinanceGoalSerializer(serializers.ModelSerializer):
    scope_display = serializers.CharField(
        source='get_scope_display',
        read_only=True
    )

    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    members = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    is_ready_to_complete = serializers.SerializerMethodField()
    contributions = FinanceGoalContributionSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = FinanceGoal
        fields = [
            'id',
            'title',
            'description',
            'scope',
            'scope_display',
            'current_amount',
            'target_amount',
            'progress_percent',
            'is_ready_to_complete',
            'status',
            'status_display',
            'finance_space',
            'members',
            'created_by',
            'created_by_name',
            'completed_at',
            'contributions',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'scope_display',
            'progress_percent',
            'is_ready_to_complete',
            'status_display',
            'finance_space',
            'members',
            'created_by',
            'created_by_name',
            'completed_at',
            'contributions',
            'created_at',
            'updated_at',
        ]

    def get_members(self, obj):
        request = self.context.get('request')
        current_user = request.user if request else None

        return [
            {
                'id': user.id,
                'name': get_user_display_name(user),
                'initials': get_user_initials(user),
                'avatar_url': get_user_avatar_url(user, request),
                'is_current_user': current_user and user.id == current_user.id,
            }
            for user in obj.members.all()
        ]

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)

    def get_progress_percent(self, obj):
        return obj.progress_percent

    def get_is_ready_to_complete(self, obj):
        return obj.is_ready_to_complete