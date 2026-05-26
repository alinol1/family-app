import random

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Кастомная модель пользователя.
    Расширяет стандартного пользователя Django
    под задачи семейного приложения.
    """

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='Телефон'
    )

    avatar = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
        verbose_name='Аватар'
    )

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

    city = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Город'
    )

    chronic_diseases = models.TextField(
        blank=True,
        default='',
        verbose_name='Хронические заболевания'
    )

    medications = models.TextField(
        blank=True,
        default='',
        verbose_name='Принимаемые лекарства'
    )

    emergency_contact_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        verbose_name='Имя экстренного контакта'
    )

    emergency_contact_phone = models.CharField(
        max_length=30,
        blank=True,
        default='',
        verbose_name='Телефон экстренного контакта'
    )

    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Последняя активность'
    )

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return f'{full_name or self.username} ({self.username})'


class UserPresence(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='presence',
        verbose_name='Пользователь'
    )

    is_online = models.BooleanField(
        default=False,
        verbose_name='Онлайн'
    )

    connections_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Количество активных соединений'
    )

    last_seen = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Последняя активность'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )

    class Meta:
        verbose_name = 'Онлайн-статус пользователя'
        verbose_name_plural = 'Онлайн-статусы пользователей'

    def __str__(self):
        return f'{self.user} — {"online" if self.is_online else "offline"}'


class PasswordResetCode(models.Model):
    """
    Код для сброса пароля.
    Отправляется на email пользователя.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reset_codes',
        verbose_name='Пользователь'
    )

    code = models.CharField(
        max_length=6,
        verbose_name='Код'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Создан'
    )

    is_used = models.BooleanField(
        default=False,
        verbose_name='Использован'
    )

    class Meta:
        verbose_name = 'Код сброса пароля'
        verbose_name_plural = 'Коды сброса пароля'

    def __str__(self):
        return f'{self.user.email} — {self.code}'

    @staticmethod
    def generate_code():
        return str(random.randint(100000, 999999))