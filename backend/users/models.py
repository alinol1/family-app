from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Кастомная модель пользователя.
    Расширяет стандартного пользователя Django
    под задачи семейного приложения.
    """

    # Номер телефона
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Телефон'
    )

    # Фото профиля
    avatar = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
        verbose_name='Аватар'
    )

    # Роль пользователя в семье
    ROLE_CHOICES = [
        ('admin', 'Администратор'),
        ('adult', 'Взрослый'),
        ('child', 'Ребёнок'),
    ]
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='adult',
        verbose_name='Роль'
    )

    # Экстренная медицинская информация
    blood_type = models.CharField(
        max_length=5,
        blank=True,
        null=True,
        verbose_name='Группа крови'
    )

    allergies = models.TextField(
        blank=True,
        null=True,
        verbose_name='Аллергии'
    )

    medical_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Медицинские заметки'
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.username})'