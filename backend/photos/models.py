from django.db import models

from users.models import User
from families.models import Family


class PhotoAlbum(models.Model):
    """
    Альбом семейных фотографий.
    Альбом принадлежит конкретной семье.
    """

    title = models.CharField(
        max_length=100,
        verbose_name='Название альбома'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='photo_albums',
        verbose_name='Семья'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_photo_albums',
        verbose_name='Создатель'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )

    class Meta:
        verbose_name = 'Фотоальбом'
        verbose_name_plural = 'Фотоальбомы'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.family}'


class Photo(models.Model):
    """
    Фотография внутри семейного альбома.
    """

    album = models.ForeignKey(
        PhotoAlbum,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Альбом'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Семья'
    )

    title = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Название фотографии'
    )

    image = models.ImageField(
        upload_to='photos/',
        verbose_name='Фотография'
    )

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_photos',
        verbose_name='Загрузил'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата загрузки'
    )

    class Meta:
        verbose_name = 'Фотография'
        verbose_name_plural = 'Фотографии'
        ordering = ['-created_at']

    def __str__(self):
        return self.title or f'Фото #{self.id}'