from django.db import models
from django.core.validators import MinValueValidator

from users.models import User
from families.models import Family


class Category(models.Model):
    """
    Категория финансовой операции.
    Категории делятся на доходы и расходы.
    """

    TYPE_CHOICES = [
        ('income', 'Доход'),
        ('expense', 'Расход'),
    ]

    title = models.CharField(
        max_length=100,
        verbose_name='Название категории'
    )

    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        verbose_name='Тип категории'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='finance_categories',
        verbose_name='Семья'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_finance_categories',
        verbose_name='Создатель'
    )

    is_default = models.BooleanField(
        default=False,
        verbose_name='Стандартная категория'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Категория финансов'
        verbose_name_plural = 'Категории финансов'
        ordering = ['type', 'title']
        constraints = [
            models.UniqueConstraint(
                fields=['family', 'type', 'title'],
                name='unique_finance_category_per_family_type'
            )
        ]

    def __str__(self):
        return f'{self.title} ({self.get_type_display()})'


class FinanceRecord(models.Model):
    """
    Финансовая операция семьи.
    Это может быть доход или расход.
    """

    TYPE_CHOICES = [
        ('income', 'Доход'),
        ('expense', 'Расход'),
    ]

    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        verbose_name='Тип операции'
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Сумма'
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finance_records',
        verbose_name='Категория'
    )

    description = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='Описание'
    )

    date = models.DateField(
        verbose_name='Дата операции'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='finance_records',
        verbose_name='Семья'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_finance_records',
        verbose_name='Кто добавил'
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
        verbose_name = 'Финансовая операция'
        verbose_name_plural = 'Финансовые операции'
        ordering = ['-date', '-created_at']

    def __str__(self):
        sign = '+' if self.type == 'income' else '-'
        return f'{sign}{self.amount} — {self.category}'


class FamilyGoal(models.Model):
    """
    Семейная финансовая цель.
    Для MVP делаем одну активную цель на семью.
    """

    title = models.CharField(
        max_length=120,
        verbose_name='Название цели'
    )

    current_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='Накоплено'
    )

    target_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Целевая сумма'
    )

    family = models.OneToOneField(
        Family,
        on_delete=models.CASCADE,
        related_name='finance_goal',
        verbose_name='Семья'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_family_goals',
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
        verbose_name = 'Семейная финансовая цель'
        verbose_name_plural = 'Семейные финансовые цели'

    def __str__(self):
        return f'{self.title} — {self.family}'

    @property
    def progress_percent(self):
        if self.target_amount <= 0:
            return 0

        progress = (self.current_amount / self.target_amount) * 100

        if progress > 100:
            return 100

        return round(progress, 2)