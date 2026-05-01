from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Photo
from .serializers import PhotoSerializer


class PhotoListView(APIView):
    """
    Список всех фото семьи.
    GET /api/photos/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Все фото семьи, сначала новые
        photos = Photo.objects.filter(
            family=family
        ).order_by('-created_at')

        serializer = PhotoSerializer(photos, many=True)
        return Response(serializer.data)


class UploadPhotoView(APIView):
    """
    Загрузка фотографии.
    POST /api/photos/upload/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        serializer = PhotoSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(
                uploaded_by=request.user,
                family=family
            )
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class PhotoDetailView(APIView):
    """
    Просмотр и удаление фото.
    GET /api/photos/<photo_id>/
    DELETE /api/photos/<photo_id>/
    """
    permission_classes = [IsAuthenticated]

    def get_photo(self, photo_id, user):
        try:
            family = user.family_membership.family
            photo = Photo.objects.get(
                id=photo_id,
                family=family
            )
            return photo, None
        except Photo.DoesNotExist:
            return None, Response(
                {'error': 'Фото не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception:
            return None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get(self, request, photo_id):
        photo, error = self.get_photo(photo_id, request.user)
        if error:
            return error

        serializer = PhotoSerializer(photo)
        return Response(serializer.data)

    def delete(self, request, photo_id):
        photo, error = self.get_photo(photo_id, request.user)
        if error:
            return error

        # Удалить может только тот кто загрузил
        if photo.uploaded_by != request.user:
            return Response(
                {'error': 'Только загрузивший может удалить фото'},
                status=status.HTTP_403_FORBIDDEN
            )

        photo.delete()
        return Response(
            {'message': 'Фото удалено'},
            status=status.HTTP_200_OK
        )


class PhotosByMonthView(APIView):
    """
    Фото сгруппированные по месяцам.
    GET /api/photos/by-month/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        photos = Photo.objects.filter(
            family=family
        ).order_by('-created_at')

        serializer = PhotoSerializer(photos, many=True)

        # Группируем по месяцам
        grouped = {}
        for photo in serializer.data:
            month_year = photo['month_year']
            if month_year not in grouped:
                grouped[month_year] = []
            grouped[month_year].append(photo)

        # Преобразуем в список
        result = [
            {
                'month_year': month,
                'photos': photos
            }
            for month, photos in grouped.items()
        ]

        return Response(result)