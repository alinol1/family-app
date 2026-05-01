from django.db import models
from users.models import User
from families.models import Family


class Photo(models.Model):
    """
    Модель фотографии.
    Общая семейная фотогалерея.
    """

    # Файл фотографии
    image = models.ImageField(
        upload_to='photos/%Y/%m/',
        verbose_name='Фотография'
    )

    # Подпись к фото (необязательно)
    caption = models.TextField(
        blank=True,
        null=True,
        verbose_name='Подпись'
    )

    # Кто загрузил
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Загрузил'
    )

    # Семья
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='photos',
        verbose_name='Семья'
    )

    # Дата загрузки
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата загрузки'
    )

    class Meta:
        verbose_name = 'Фотография'
        verbose_name_plural = 'Фотографии'
        ordering = ['-created_at']

    def __str__(self):
        return f'Фото от {self.uploaded_by.first_name} — {self.created_at.strftime("%d.%m.%Y")}'