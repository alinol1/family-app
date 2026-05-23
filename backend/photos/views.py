from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from django.core.exceptions import ValidationError as DjangoValidationError

from core.validators import validate_image_file

from .models import PhotoAlbum, Photo
from .serializers import PhotoAlbumSerializer, PhotoSerializer


def get_user_family(user):
    """
    Возвращает семью пользователя.
    Если пользователь не состоит в семье — возвращает None.
    """
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def is_user_family_admin(user, family):
    """
    Проверка, является ли пользователь администратором именно этой семьи.
    """
    if not family:
        return False

    return family.admin_id == user.id


class PhotoAlbumListCreateView(APIView):
    """
    Список альбомов семьи и создание нового альбома.

    GET  /api/photos/albums/
    POST /api/photos/albums/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        albums = PhotoAlbum.objects.filter(
            family=family
        ).order_by('-created_at')

        serializer = PhotoAlbumSerializer(albums, many=True)
        return Response(serializer.data)

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = request.data.get('title', '').strip()

        if not title:
            return Response(
                {'error': 'Название альбома обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        album = PhotoAlbum.objects.create(
            title=title,
            family=family,
            created_by=request.user
        )

        serializer = PhotoAlbumSerializer(album)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class PhotoAlbumDetailView(APIView):
    """
    Просмотр, редактирование и удаление альбома.

    GET    /api/photos/albums/<album_id>/
    PATCH  /api/photos/albums/<album_id>/
    DELETE /api/photos/albums/<album_id>/
    """

    permission_classes = [IsAuthenticated]

    def get_album(self, request, album_id):
        family = get_user_family(request.user)

        if not family:
            return None, None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            album = PhotoAlbum.objects.get(
                id=album_id,
                family=family
            )
        except PhotoAlbum.DoesNotExist:
            return None, None, Response(
                {'error': 'Альбом не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        return family, album, None

    def get(self, request, album_id):
        family, album, error_response = self.get_album(request, album_id)

        if error_response:
            return error_response

        serializer = PhotoAlbumSerializer(album)
        return Response(serializer.data)

    def patch(self, request, album_id):
        family, album, error_response = self.get_album(request, album_id)

        if error_response:
            return error_response

        if (
            album.created_by_id != request.user.id
            and not is_user_family_admin(request.user, family)
        ):
            return Response(
                {'error': 'Вы не можете редактировать этот альбом'},
                status=status.HTTP_403_FORBIDDEN
            )

        title = request.data.get('title', '').strip()

        if not title:
            return Response(
                {'error': 'Название альбома обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        album.title = title
        album.save()

        serializer = PhotoAlbumSerializer(album)
        return Response(serializer.data)

    def delete(self, request, album_id):
        family, album, error_response = self.get_album(request, album_id)

        if error_response:
            return error_response

        if (
            album.created_by_id != request.user.id
            and not is_user_family_admin(request.user, family)
        ):
            return Response(
                {'error': 'Вы не можете удалить этот альбом'},
                status=status.HTTP_403_FORBIDDEN
            )

        album.delete()

        return Response(
            {'message': 'Альбом удалён'},
            status=status.HTTP_200_OK
        )


class AlbumPhotoListUploadView(APIView):
    """
    Список фотографий альбома и загрузка фото в альбом.

    GET  /api/photos/albums/<album_id>/photos/
    POST /api/photos/albums/<album_id>/photos/
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_album(self, request, album_id):
        family = get_user_family(request.user)

        if not family:
            return None, None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            album = PhotoAlbum.objects.get(
                id=album_id,
                family=family
            )
        except PhotoAlbum.DoesNotExist:
            return None, None, Response(
                {'error': 'Альбом не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        return family, album, None

    def get(self, request, album_id):
        family, album, error_response = self.get_album(request, album_id)

        if error_response:
            return error_response

        photos = Photo.objects.filter(
            family=family,
            album=album
        ).order_by('-created_at')

        serializer = PhotoSerializer(photos, many=True)
        return Response(serializer.data)

    def post(self, request, album_id):
        family, album, error_response = self.get_album(request, album_id)

        if error_response:
            return error_response

        image = request.FILES.get('image')

        if not image:
            return Response(
                {'error': 'Файл фотографии обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_image_file(image)
        except DjangoValidationError as error:
            return Response(
                {
                    'error': (
                        error.messages[0]
                        if hasattr(error, 'messages')
                        else str(error)
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        title = request.data.get('title', '').strip()

        if not title:
            title = image.name.rsplit('.', 1)[0]

        photo = Photo.objects.create(
            album=album,
            family=family,
            title=title,
            image=image,
            uploaded_by=request.user
        )

        serializer = PhotoSerializer(photo)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class PhotoDetailView(APIView):
    """
    Просмотр, редактирование и удаление фотографии.

    GET    /api/photos/photo/<photo_id>/
    PATCH  /api/photos/photo/<photo_id>/
    DELETE /api/photos/photo/<photo_id>/
    """

    permission_classes = [IsAuthenticated]

    def get_photo(self, request, photo_id):
        family = get_user_family(request.user)

        if not family:
            return None, None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            photo = Photo.objects.select_related(
                'album',
                'family',
                'uploaded_by',
            ).get(
                id=photo_id,
                family=family
            )
        except Photo.DoesNotExist:
            return None, None, Response(
                {'error': 'Фотография не найдена'},
                status=status.HTTP_404_NOT_FOUND
            )

        return family, photo, None

    def get(self, request, photo_id):
        family, photo, error_response = self.get_photo(request, photo_id)

        if error_response:
            return error_response

        serializer = PhotoSerializer(photo)
        return Response(serializer.data)

    def patch(self, request, photo_id):
        family, photo, error_response = self.get_photo(request, photo_id)

        if error_response:
            return error_response

        if (
            photo.uploaded_by_id != request.user.id
            and not is_user_family_admin(request.user, family)
        ):
            return Response(
                {'error': 'Вы не можете редактировать эту фотографию'},
                status=status.HTTP_403_FORBIDDEN
            )

        title = request.data.get('title', '').strip()

        if not title:
            return Response(
                {'error': 'Название фотографии обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        photo.title = title
        photo.save()

        serializer = PhotoSerializer(photo)
        return Response(serializer.data)

    def delete(self, request, photo_id):
        family, photo, error_response = self.get_photo(request, photo_id)

        if error_response:
            return error_response

        if (
            photo.uploaded_by_id != request.user.id
            and not is_user_family_admin(request.user, family)
        ):
            return Response(
                {'error': 'Вы не можете удалить эту фотографию'},
                status=status.HTTP_403_FORBIDDEN
            )

        photo.delete()

        return Response(
            {'message': 'Фотография удалена'},
            status=status.HTTP_200_OK
        )