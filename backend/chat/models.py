from django.db import models
from users.models import User
from families.models import Family


class Chat(models.Model):
    """
    Модель чата.
    Может быть семейным (групповым) или личным (между двумя людьми).
    """

    CHAT_TYPES = [
        ('family', 'Семейный чат'),
        ('personal', 'Личный чат'),
    ]

    # Тип чата
    chat_type = models.CharField(
        max_length=10,
        choices=CHAT_TYPES,
        default='personal',
        verbose_name='Тип чата'
    )

    # Семья (только для семейного чата)
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chats',
        verbose_name='Семья'
    )

    # Участники чата
    members = models.ManyToManyField(
        User,
        related_name='chats',
        verbose_name='Участники'
    )

    # Дата создания
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Чат'
        verbose_name_plural = 'Чаты'

    def __str__(self):
        if self.chat_type == 'family':
            return f'Семейный чат — {self.family.name}'
        return f'Личный чат #{self.id}'


class Message(models.Model):
    """
    Модель сообщения.
    Каждое сообщение принадлежит чату и имеет отправителя.
    """

    # В каком чате
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Чат'
    )

    # Кто отправил
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Отправитель'
    )

    # Текст сообщения
    text = models.TextField(
        blank=True,
        null=True,
        verbose_name='Текст'
    )

    # Прикреплённый файл или фото
    media = models.FileField(
        upload_to='chat_media/',
        blank=True,
        null=True,
        verbose_name='Медиафайл'
    )

    # Прочитано ли сообщение
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )

    # Дата отправки
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