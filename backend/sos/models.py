from django.db import models

from users.models import User
from families.models import Family


class SOSSignal(models.Model):
    """
    Модель экстренного сигнала.
    Отправляется при нажатии кнопки SOS.
    """

    STATUS_SENT = 'sent'
    STATUS_RECEIVED = 'received'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_CANCELLED = 'cancelled'

    ACTIVE_STATUSES = [
        STATUS_SENT,
        STATUS_RECEIVED,
        STATUS_CONFIRMED,
    ]

    STATUS_CHOICES = [
        (STATUS_SENT, 'Отправлен'),
        (STATUS_RECEIVED, 'Получен'),
        (STATUS_CONFIRMED, 'Подтверждён'),
        (STATUS_CANCELLED, 'Отменён'),
    ]

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sos_signals',
        verbose_name='Отправитель'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='sos_signals',
        verbose_name='Семья'
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name='Широта'
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name='Долгота'
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Адрес'
    )

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_SENT,
        verbose_name='Статус'
    )

    confirmed_by = models.ManyToManyField(
        User,
        blank=True,
        related_name='confirmed_sos',
        verbose_name='Подтвердили получение'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время отправки'
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Время отмены'
    )

    class Meta:
        verbose_name = 'SOS сигнал'
        verbose_name_plural = 'SOS сигналы'
        ordering = ['-created_at']

    def __str__(self):
        sender_name = f'{self.sender.first_name} {self.sender.last_name}'.strip()
        sender_name = sender_name or self.sender.username
        return f'SOS от {sender_name} — {self.created_at.strftime("%d.%m.%Y %H:%M")}'

    @property
    def is_active(self):
        """
        Активен ли сигнал прямо сейчас.
        Подтверждённый или отменённый сигнал больше не считается активной тревогой.
        """
        return self.status in self.ACTIVE_STATUSES