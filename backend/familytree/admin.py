from django.contrib import admin
from .models import FamilyTreeNode


@admin.register(FamilyTreeNode)
class FamilyTreeNodeAdmin(admin.ModelAdmin):

    list_display = [
        'full_name',
        'gender',
        'birth_date',
        'parent',
        'spouse',
        'family',
        'added_by',
        'created_at'
    ]

    list_filter = ['gender', 'family']

    search_fields = ['full_name']