from django.db import models

from users.models import User
from families.models import Family


class Chat(models.Model):
    CHAT_TYPES = [
        ('family', 'Групповой чат'),
        ('personal', 'Личный чат'),
    ]

    chat_type = models.CharField(
        max_length=10,
        choices=CHAT_TYPES,
        default='personal',
        verbose_name='Тип чата'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chats',
        verbose_name='Семья'
    )

    title = models.CharField(
        max_length=150,
        blank=True,
        verbose_name='Название чата'
    )

    photo = models.ImageField(
        upload_to='chat_photos/',
        null=True,
        blank=True,
        verbose_name='Фото чата'
    )



    members = models.ManyToManyField(
        User,
        related_name='chats',
        verbose_name='Участники'
    )

    is_pinned = models.BooleanField(
        default=False,
        verbose_name='Закреплён'
    )

    is_main_family_chat = models.BooleanField(
        default=False,
        verbose_name='Основной семейный чат'
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
        verbose_name = 'Чат'
        verbose_name_plural = 'Чаты'
        ordering = ['-is_pinned', '-updated_at', '-created_at']

    def __str__(self):
        if self.chat_type == 'family':
            return self.title or f'Групповой чат #{self.id}'
        return f'Личный чат #{self.id}'


class Message(models.Model):
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Чат'
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Отправитель'
    )

    text = models.TextField(
        blank=True,
        null=True,
        verbose_name='Текст'
    )

    media = models.FileField(
        upload_to='chat_media/',
        blank=True,
        null=True,
        verbose_name='Медиафайл'
    )

    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата отправки'
    )

    class Meta:
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.first_name}: {self.text[:30] if self.text else "медиафайл"}'