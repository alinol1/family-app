from django.contrib import admin

from .models import Category, FinanceRecord, FamilyGoal


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'type',
        'family',
        'created_by',
        'is_default',
        'created_at',
    ]

    list_filter = [
        'type',
        'family',
        'is_default',
    ]

    search_fields = [
        'title',
        'created_by__username',
        'created_by__email',
    ]


@admin.register(FinanceRecord)
class FinanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'type',
        'amount',
        'category',
        'family',
        'created_by',
        'date',
        'created_at',
    ]

    list_filter = [
        'type',
        'category',
        'family',
        'date',
    ]

    search_fields = [
        'description',
        'category__title',
        'created_by__username',
        'created_by__email',
    ]


@admin.register(FamilyGoal)
class FamilyGoalAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'current_amount',
        'target_amount',
        'family',
        'created_by',
        'updated_at',
    ]

    search_fields = [
        'title',
        'created_by__username',
        'created_by__email',
    ]