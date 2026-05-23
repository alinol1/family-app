from django.contrib import admin

from .models import PhotoAlbum, Photo


@admin.register(PhotoAlbum)
class PhotoAlbumAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'family',
        'created_by',
        'created_at',
    ]

    list_filter = [
        'family',
        'created_at',
    ]

    search_fields = [
        'title',
        'created_by__username',
        'created_by__email',
    ]


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'album',
        'family',
        'uploaded_by',
        'created_at',
    ]

    list_filter = [
        'family',
        'album',
        'created_at',
    ]

    search_fields = [
        'title',
        'uploaded_by__username',
        'uploaded_by__email',
    ]