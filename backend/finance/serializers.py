from rest_framework import serializers

from .models import Category, FinanceRecord, FamilyGoal


def get_user_display_name(user):
    """
    Возвращает отображаемое имя пользователя.
    """
    if not user:
        return None

    name = f'{user.first_name} {user.last_name}'.strip()
    return name or user.username


class CategorySerializer(serializers.ModelSerializer):
    """
    Сериализатор категории финансов.

    Важно:
    - family наружу не отдаём;
    - created_by можно оставить как id пользователя;
    - created_by_name нужен для отображения.
    """

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
            'created_by',
            'created_by_name',
            'is_default',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'type_display',
            'created_by',
            'created_by_name',
            'is_default',
            'created_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)


class FinanceRecordSerializer(serializers.ModelSerializer):
    """
    Сериализатор финансовой операции.

    Важно:
    - family наружу не отдаём;
    - category оставляем как id категории;
    - category_title отдаём для удобного отображения.
    """

    type_display = serializers.CharField(
        source='get_type_display',
        read_only=True
    )

    category_title = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FinanceRecord
        fields = [
            'id',
            'type',
            'type_display',
            'amount',
            'category',
            'category_title',
            'description',
            'date',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'type_display',
            'category_title',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

    def get_category_title(self, obj):
        if obj.category:
            return obj.category.title

        return 'Без категории'

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)


class FamilyGoalSerializer(serializers.ModelSerializer):
    """
    Сериализатор семейной финансовой цели.

    Важно:
    - family наружу не отдаём;
    - progress_percent отдаётся только для чтения.
    """

    created_by_name = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = FamilyGoal
        fields = [
            'id',
            'title',
            'current_amount',
            'target_amount',
            'progress_percent',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'progress_percent',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)

    def get_progress_percent(self, obj):
        return obj.progress_percent