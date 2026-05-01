from django.contrib import admin
from .models import Category, FinanceRecord, FamilyGoal


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_type', 'icon']
    list_filter = ['category_type']


@admin.register(FinanceRecord)
class FinanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        'record_type',
        'amount',
        'category',
        'created_by',
        'family',
        'created_at'
    ]
    list_filter = ['record_type', 'family']
    search_fields = ['description']


@admin.register(FamilyGoal)
class FamilyGoalAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'target_amount',
        'current_amount',
        'family',
        'created_by'
    ]