from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from users.models import User
from families.models import Family


class FinanceSpace(models.Model):
    """
    Финансовая ячейка: личный бюджет, совместный бюджет или сбор.
    Пользователь видит только те ячейки, где он состоит в участниках.
    """

    TYPE_CHOICES = [
        ('personal', 'Личный бюджет'),
        ('joint', 'Совместный бюджет'),
        ('collection', 'Сбор / цель'),
    ]

    title = models.CharField(
        max_length=120,
        verbose_name='Название ячейки'
    )

    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='joint',
        verbose_name='Тип ячейки'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='finance_spaces',
        verbose_name='Семья'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_finance_spaces',
        verbose_name='Создатель'
    )

    members = models.ManyToManyField(
        User,
        through='FinanceSpaceMember',
        through_fields=('finance_space', 'user'),
        related_name='finance_spaces',
        verbose_name='Участники'
    )

    is_archived = models.BooleanField(
        default=False,
        verbose_name='Архивирована'
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
        verbose_name = 'Финансовая ячейка'
        verbose_name_plural = 'Финансовые ячейки'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.family}'

    @property
    def income_total(self):
        return self.records.filter(type='income').aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

    @property
    def expense_total(self):
        return self.records.filter(type='expense').aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

    @property
    def balance(self):
        return self.income_total - self.expense_total


class FinanceSpaceMember(models.Model):
    """
    Участник конкретной финансовой ячейки.
    """

    ROLE_CHOICES = [
        ('owner', 'Владелец'),
        ('member', 'Участник'),
    ]

    finance_space = models.ForeignKey(
        FinanceSpace,
        on_delete=models.CASCADE,
        related_name='space_members',
        verbose_name='Финансовая ячейка'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='finance_space_memberships',
        verbose_name='Пользователь'
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='member',
        verbose_name='Роль'
    )

    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_finance_space_members',
        verbose_name='Кем добавлен'
    )

    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата добавления'
    )

    class Meta:
        verbose_name = 'Участник финансовой ячейки'
        verbose_name_plural = 'Участники финансовых ячеек'
        constraints = [
            models.UniqueConstraint(
                fields=['finance_space', 'user'],
                name='unique_finance_space_member'
            )
        ]

    def __str__(self):
        return f'{self.user} → {self.finance_space}'


class Category(models.Model):
    """
    Категория операции внутри конкретной финансовой ячейки.
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

    finance_space = models.ForeignKey(
        FinanceSpace,
        on_delete=models.CASCADE,
        related_name='categories',
        verbose_name='Финансовая ячейка'
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
                fields=['finance_space', 'type', 'title'],
                name='unique_finance_category_per_space_type'
            )
        ]

    def __str__(self):
        return f'{self.title} ({self.get_type_display()})'


class FinanceRecord(models.Model):
    """
    Финансовая операция внутри конкретной ячейки.
    Операцию всегда создаёт текущий пользователь.
    """

    TYPE_CHOICES = [
        ('income', 'Доход'),
        ('expense', 'Расход'),
    ]

    title = models.CharField(
        max_length=120,
        blank=True,
        default='',
        verbose_name='Название операции'
    )

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

    description = models.TextField(
        blank=True,
        default='',
        verbose_name='Описание'
    )

    date = models.DateField(
        default=timezone.localdate,
        verbose_name='Дата операции'
    )

    finance_space = models.ForeignKey(
        FinanceSpace,
        on_delete=models.CASCADE,
        related_name='records',
        verbose_name='Финансовая ячейка'
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
        return f'{sign}{self.amount} — {self.title}'


class FinanceGoal(models.Model):
    """
    Цель внутри финансовой ячейки.
    Может быть личной или общей для выбранных участников ячейки.
    """

    SCOPE_CHOICES = [
        ('personal', 'Личная цель'),
        ('family', 'Общая цель'),
    ]

    STATUS_CHOICES = [
        ('active', 'Активная'),
        ('completed', 'Выполнена'),
    ]

    title = models.CharField(
        max_length=120,
        verbose_name='Название цели'
    )

    description = models.TextField(
        blank=True,
        default='',
        verbose_name='Описание'
    )

    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='personal',
        verbose_name='Тип цели'
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

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='Статус'
    )

    finance_space = models.ForeignKey(
        FinanceSpace,
        on_delete=models.CASCADE,
        related_name='goals',
        verbose_name='Финансовая ячейка'
    )

    members = models.ManyToManyField(
        User,
        blank=True,
        related_name='finance_goal_memberships',
        verbose_name='Участники цели'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_finance_goals',
        verbose_name='Создатель'
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
        verbose_name = 'Финансовая цель'
        verbose_name_plural = 'Финансовые цели'
        ordering = ['status', '-created_at']

    def __str__(self):
        return f'{self.title} — {self.finance_space}'

    @property
    def progress_percent(self):
        if self.target_amount <= 0:
            return 0

        progress = (self.current_amount / self.target_amount) * 100

        if progress > 100:
            return 100

        return round(progress, 2)

    @property
    def is_ready_to_complete(self):
        return self.status == 'active' and self.current_amount >= self.target_amount


class FinanceGoalContribution(models.Model):
    """
    Пополнение цели.
    """

    goal = models.ForeignKey(
        FinanceGoal,
        on_delete=models.CASCADE,
        related_name='contributions',
        verbose_name='Цель'
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        verbose_name='Сумма'
    )

    comment = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='Комментарий'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_goal_contributions',
        verbose_name='Кто пополнил'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата пополнения'
    )

    class Meta:
        verbose_name = 'Пополнение цели'
        verbose_name_plural = 'Пополнения целей'
        ordering = ['-created_at']

    def __str__(self):
        return f'+{self.amount} → {self.goal}'