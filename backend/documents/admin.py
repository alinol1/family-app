from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):

    list_display = [
        'title',
        'doc_type',
        'owner',
        'uploaded_by',
        'access',
        'is_family_doc',
        'created_at'
    ]

    list_filter = [
        'doc_type',
        'access',
        'is_family_doc'
    ]

    search_fields = ['title']

    filter_horizontal = ['shared_with']