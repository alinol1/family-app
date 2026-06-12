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
        'updated_at',
    ]

    list_filter = [
        'gender',
        'family',
        'created_at',
        'updated_at',
    ]

    search_fields = [
        'first_name',
        'last_name',
        'middle_name',
        'linked_user__username',
        'linked_user__first_name',
        'linked_user__last_name',
        'family__name',
    ]

    readonly_fields = [
        'created_at',
        'updated_at',
    ]

    autocomplete_fields = [
        'family',
        'linked_user',
        'added_by',
    ]

    fieldsets = (
        (
            'Основная информация',
            {
                'fields': (
                    'family',
                    'linked_user',
                    'first_name',
                    'last_name',
                    'middle_name',
                    'gender',
                    'birth_date',
                    'death_date',
                )
            }
        ),
        (
            'Фото и заметки',
            {
                'fields': (
                    'photo',
                    'photo_url',
                    'note',
                )
            }
        ),
        (
            'Служебная информация',
            {
                'fields': (
                    'added_by',
                    'created_at',
                    'updated_at',
                )
            }
        ),
    )


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
        'created_at',
    ]

    search_fields = [
        'parent__first_name',
        'parent__last_name',
        'parent__middle_name',
        'child__first_name',
        'child__last_name',
        'child__middle_name',
        'family__name',
    ]

    readonly_fields = [
        'created_at',
    ]

    autocomplete_fields = [
        'family',
        'parent',
        'child',
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
        'created_at',
    ]

    search_fields = [
        'partner1__first_name',
        'partner1__last_name',
        'partner1__middle_name',
        'partner2__first_name',
        'partner2__last_name',
        'partner2__middle_name',
        'family__name',
    ]

    readonly_fields = [
        'created_at',
    ]

    autocomplete_fields = [
        'family',
        'partner1',
        'partner2',
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

    list_filter = [
        'updated_at',
    ]

    search_fields = [
        'user__username',
        'user__first_name',
        'user__last_name',
        'person__first_name',
        'person__last_name',
        'person__middle_name',
        'label',
    ]

    readonly_fields = [
        'updated_at',
    ]

    autocomplete_fields = [
        'user',
        'person',
    ]