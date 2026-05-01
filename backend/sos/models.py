from django.db import models
from users.models import User
from families.models import Family


class SOSSignal(models.Model):
    """
    Модель экстренного сигнала.
    Отправляется при нажатии кнопки SOS.
    """

    # Статусы сигнала
    STATUS_CHOICES = [
        ('sent', 'Отправлен'),
        ('received', 'Получен'),
        ('confirmed', 'Подтверждён'),
        ('cancelled', 'Отменён'),
    ]

    # Кто отправил сигнал
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sos_signals',
        verbose_name='Отправитель'
    )

    # Семья
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='sos_signals',
        verbose_name='Семья'
    )

    # Широта (геолокация)
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name='Широта'
    )

    # Долгота (геолокация)
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        blank=True,
        null=True,
        verbose_name='Долгота'
    )

    # Адрес текстом
    address = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Адрес'
    )

    # Статус сигнала
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='sent',
        verbose_name='Статус'
    )

    # Кто подтвердил получение
    confirmed_by = models.ManyToManyField(
        User,
        blank=True,
        related_name='confirmed_sos',
        verbose_name='Подтвердили получение'
    )

    # Дата и время отправки
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Время отправки'
    )

    # Дата и время отмены
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
        return f'SOS от {self.sender.first_name} — {self.created_at.strftime("%d.%m.%Y %H:%M")}'

    @property
    def is_active(self):
        """
        Активен ли сигнал прямо сейчас.
        Сигнал активен пока не отменён и не подтверждён всеми.
        """
        return self.status not in ['cancelled']