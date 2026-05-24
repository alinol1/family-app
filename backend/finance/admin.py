from django.contrib import admin

from .models import (
    Category,
    FinanceGoal,
    FinanceGoalContribution,
    FinanceRecord,
    FinanceSpace,
    FinanceSpaceMember,
)


class FinanceSpaceMemberInline(admin.TabularInline):
    model = FinanceSpaceMember
    extra = 0


@admin.register(FinanceSpace)
class FinanceSpaceAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'type',
        'family',
        'created_by',
        'is_archived',
        'created_at',
    ]

    list_filter = [
        'type',
        'family',
        'is_archived',
    ]

    search_fields = [
        'title',
        'created_by__username',
        'created_by__email',
    ]

    inlines = [
        FinanceSpaceMemberInline,
    ]


@admin.register(FinanceSpaceMember)
class FinanceSpaceMemberAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'finance_space',
        'user',
        'role',
        'added_by',
        'joined_at',
    ]

    list_filter = [
        'role',
        'finance_space',
    ]

    search_fields = [
        'finance_space__title',
        'user__username',
        'user__email',
    ]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'type',
        'finance_space',
        'created_by',
        'is_default',
        'created_at',
    ]

    list_filter = [
        'type',
        'finance_space',
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
        'title',
        'type',
        'amount',
        'category',
        'finance_space',
        'created_by',
        'date',
        'created_at',
    ]

    list_filter = [
        'type',
        'category',
        'finance_space',
        'date',
    ]

    search_fields = [
        'title',
        'description',
        'category__title',
        'created_by__username',
        'created_by__email',
    ]


@admin.register(FinanceGoal)
class FinanceGoalAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'scope',
        'status',
        'current_amount',
        'target_amount',
        'finance_space',
        'created_by',
        'completed_at',
        'updated_at',
    ]

    list_filter = [
        'scope',
        'status',
        'finance_space',
    ]

    search_fields = [
        'title',
        'created_by__username',
        'created_by__email',
    ]


@admin.register(FinanceGoalContribution)
class FinanceGoalContributionAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'goal',
        'amount',
        'created_by',
        'created_at',
    ]

    search_fields = [
        'goal__title',
        'created_by__username',
        'created_by__email',
    ]