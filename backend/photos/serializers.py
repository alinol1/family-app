from rest_framework import serializers

from .models import PhotoAlbum, Photo


def get_user_display_name(user):
    """
    Возвращает нормальное отображаемое имя пользователя.
    """
    if not user:
        return None

    name = f'{user.first_name} {user.last_name}'.strip()
    return name or user.username


class PhotoSerializer(serializers.ModelSerializer):
    """
    Сериализатор фотографии.

    Важно:
    - сырое поле image не отдаём;
    - отдаём только image_url;
    - family не отдаём;
    - album оставляем как id альбома.
    """

    image_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    album_title = serializers.CharField(
        source='album.title',
        read_only=True
    )

    class Meta:
        model = Photo
        fields = [
            'id',
            'album',
            'album_title',
            'title',
            'image_url',
            'uploaded_by',
            'uploaded_by_name',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'album',
            'album_title',
            'title',
            'image_url',
            'uploaded_by',
            'uploaded_by_name',
            'created_at',
        ]

    def get_image_url(self, obj):
        """
        Возвращает временную ссылку на фото.

        Если подключён Yandex Object Storage через django-storages,
        obj.image.url вернёт signed URL.
        """
        if not obj.image:
            return None

        return obj.image.url

    def get_uploaded_by_name(self, obj):
        return get_user_display_name(obj.uploaded_by)


class PhotoAlbumSerializer(serializers.ModelSerializer):
    """
    Сериализатор фотоальбома.

    Важно:
    - family не отдаём;
    - created_by можно оставить как id пользователя;
    - last_photo_url отдаётся как временная signed URL.
    """

    created_by_name = serializers.SerializerMethodField()
    photos_count = serializers.SerializerMethodField()
    last_photo_url = serializers.SerializerMethodField()
    last_photo_title = serializers.SerializerMethodField()

    class Meta:
        model = PhotoAlbum
        fields = [
            'id',
            'title',
            'created_by',
            'created_by_name',
            'photos_count',
            'last_photo_url',
            'last_photo_title',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'title',
            'created_by',
            'created_by_name',
            'photos_count',
            'last_photo_url',
            'last_photo_title',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        return get_user_display_name(obj.created_by)

    def get_photos_count(self, obj):
        return obj.photos.count()

    def get_last_photo_url(self, obj):
        photo = obj.photos.order_by('-created_at').first()

        if photo and photo.image:
            return photo.image.url

        return None

    def get_last_photo_title(self, obj):
        photo = obj.photos.order_by('-created_at').first()

        if photo:
            return photo.title or 'Недавно добавлено'

        return 'Пока пусто'