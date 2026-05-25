from django.contrib import admin

from .models import (
    FamilyTreePerson,
    ParentChildRelation,
    Partnership,
    FamilyTreePersonalLabel,
)


@admin.register(FamilyTreePerson)
class FamilyTreePersonAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'full_name',
        'gender',
        'birth_date',
        'death_date',
        'family',
        'linked_user',
        'added_by',
        'created_at',
    ]

    list_filter = [
        'gender',
        'family',
        'created_at',
    ]

    search_fields = [
        'first_name',
        'last_name',
        'middle_name',
        'linked_user__username',
        'linked_user__first_name',
        'linked_user__last_name',
    ]


@admin.register(ParentChildRelation)
class ParentChildRelationAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'parent',
        'child',
        'relation_type',
        'family',
        'created_at',
    ]

    list_filter = [
        'relation_type',
        'family',
    ]


@admin.register(Partnership)
class PartnershipAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'partner1',
        'partner2',
        'status',
        'family',
        'created_at',
    ]

    list_filter = [
        'status',
        'family',
    ]


@admin.register(FamilyTreePersonalLabel)
class FamilyTreePersonalLabelAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'user',
        'person',
        'label',
        'updated_at',
    ]

    search_fields = [
        'user__username',
        'user__first_name',
        'user__last_name',
        'person__first_name',
        'person__last_name',
        'label',
    ]