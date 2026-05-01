from rest_framework import serializers
from .models import Category, FinanceRecord, FamilyGoal


class CategorySerializer(serializers.ModelSerializer):
    """
    Сериализатор категории.
    """

    class Meta:
        model = Category
        fields = ['id', 'name', 'category_type', 'icon']


class FinanceRecordSerializer(serializers.ModelSerializer):
    """
    Сериализатор финансовой записи.
    """

    # Имя того кто добавил
    created_by_name = serializers.SerializerMethodField()

    # Название категории
    category_name = serializers.CharField(
        source='category.name',
        read_only=True
    )

    # Иконка категории
    category_icon = serializers.CharField(
        source='category.icon',
        read_only=True
    )

    class Meta:
        model = FinanceRecord
        fields = [
            'id',
            'record_type',
            'amount',
            'description',
            'category',
            'category_name',
            'category_icon',
            'created_by',
            'created_by_name',
            'family',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'family',
            'created_at',
        ]

    def get_created_by_name(self, obj):
        return f'{obj.created_by.first_name} {obj.created_by.last_name}'


class FamilyGoalSerializer(serializers.ModelSerializer):
    """
    Сериализатор семейной цели.
    """

    # Процент выполнения
    progress_percent = serializers.IntegerField(read_only=True)

    # Осталось накопить
    remaining = serializers.SerializerMethodField()

    class Meta:
        model = FamilyGoal
        fields = [
            'id',
            'name',
            'target_amount',
            'current_amount',
            'progress_percent',
            'remaining',
            'family',
            'created_by',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'family',
            'created_by',
            'created_at',
        ]

    def get_remaining(self, obj):
        remaining = obj.target_amount - obj.current_amount
        return max(remaining, 0)