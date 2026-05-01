import random
import string
from django.db import models
from users.models import User


def generate_invite_code():
    """
    Генерирует случайный код приглашения из 6 символов.
    Например: ABC123
    """
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=6))


class Family(models.Model):
    """
    Модель семьи.
    Центральная сущность — все модули привязаны к семье.
    """

    # Название семьи
    name = models.CharField(
        max_length=100,
        verbose_name='Название семьи'
    )

    # Администратор семьи
    admin = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='administered_families',
        verbose_name='Администратор'
    )

    # Код приглашения
    invite_code = models.CharField(
        max_length=6,
        unique=True,
        default=generate_invite_code,
        verbose_name='Код приглашения'
    )

    # Дата создания
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Семья'
        verbose_name_plural = 'Семьи'

    def __str__(self):
        return self.name


class FamilyMember(models.Model):
    """
    Связь пользователя с семьёй.
    Один пользователь — одна семья.
    """

    # Какой пользователь
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='family_membership',
        verbose_name='Пользователь'
    )

    # В какой семье
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name='Семья'
    )

    # Когда вступил
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата вступления'
    )

    class Meta:
        verbose_name = 'Участник семьи'
        verbose_name_plural = 'Участники семьи'

    def __str__(self):
        return f'{self.user.first_name} → {self.family.name}'