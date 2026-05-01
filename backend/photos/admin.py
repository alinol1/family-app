from django.contrib import admin
from .models import Photo


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):

    list_display = [
        'id',
        'uploaded_by',
        'family',
        'caption',
        'created_at'
    ]

    list_filter = ['family', 'created_at']

    search_fields = [
        'caption',
        'uploaded_by__first_name'
    ]