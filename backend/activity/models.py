from django.db import models

from families.models import Family
from users.models import User


class FamilyTask(models.Model):
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='activity_tasks',
        verbose_name='Семья'
    )

    title = models.CharField(
        max_length=255,
        verbose_name='Название задачи'
    )

    is_done = models.BooleanField(
        default=False,
        verbose_name='Выполнено'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_family_tasks',
        verbose_name='Кто добавил'
    )

    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_family_tasks',
        verbose_name='Кто выполнил'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата выполнения'
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
        ordering = ['is_done', '-created_at']
        verbose_name = 'Семейная задача'
        verbose_name_plural = 'Семейные задачи'

    def __str__(self):
        return self.title


class ShoppingItem(models.Model):
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='shopping_items',
        verbose_name='Семья'
    )

    title = models.CharField(
        max_length=255,
        verbose_name='Название продукта'
    )

    is_done = models.BooleanField(
        default=False,
        verbose_name='Куплено'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_shopping_items',
        verbose_name='Кто добавил'
    )

    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_shopping_items',
        verbose_name='Кто купил'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Дата покупки'
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
        ordering = ['is_done', '-created_at']
        verbose_name = 'Продукт'
        verbose_name_plural = 'Список продуктов'

    def __str__(self):
        return self.title