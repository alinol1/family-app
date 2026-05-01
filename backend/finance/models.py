from django.db import models
from users.models import User
from families.models import Family


class Category(models.Model):
    """
    Категория финансовой записи.
    Например: Продукты, Транспорт, Зарплата и т.д.
    """

    CATEGORY_TYPES = [
        ('expense', 'Расход'),
        ('income', 'Доход'),
    ]

    # Название категории
    name = models.CharField(
        max_length=50,
        verbose_name='Название'
    )

    # Тип категории
    category_type = models.CharField(
        max_length=10,
        choices=CATEGORY_TYPES,
        verbose_name='Тип'
    )

    # Иконка (эмодзи или название иконки)
    icon = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name='Иконка'
    )

    class Meta:
        verbose_name = 'Категория'
        verbose_name_plural = 'Категории'

    def __str__(self):
        return f'{self.icon} {self.name}' if self.icon else self.name


class FinanceRecord(models.Model):
    """
    Финансовая запись.
    Доход или расход семьи.
    """

    RECORD_TYPES = [
        ('income', 'Доход'),
        ('expense', 'Расход'),
    ]

    # Тип записи
    record_type = models.CharField(
        max_length=10,
        choices=RECORD_TYPES,
        verbose_name='Тип'
    )

    # Сумма
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Сумма'
    )

    # Описание
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Описание'
    )

    # Категория
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='records',
        verbose_name='Категория'
    )

    # Кто добавил
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='finance_records',
        verbose_name='Кто добавил'
    )

    # Семья
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='finance_records',
        verbose_name='Семья'
    )

    # Дата создания
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата'
    )

    class Meta:
        verbose_name = 'Финансовая запись'
        verbose_name_plural = 'Финансовые записи'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.record_type}: {self.amount}₽ — {self.created_by.first_name}'


class FamilyGoal(models.Model):
    """
    Семейная финансовая цель.
    Например: накопить на отпуск.
    """

    # Название цели
    name = models.CharField(
        max_length=100,
        verbose_name='Название цели'
    )

    # Целевая сумма
    target_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Целевая сумма'
    )

    # Текущая накопленная сумма
    current_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name='Накоплено'
    )

    # Семья
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='goals',
        verbose_name='Семья'
    )

    # Кто создал цель
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='goals',
        verbose_name='Кто создал'
    )

    # Дата создания
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Семейная цель'
        verbose_name_plural = 'Семейные цели'

    def __str__(self):
        return f'{self.name} — {self.current_amount}/{self.target_amount}₽'

    @property
    def progress_percent(self):
        """
        Процент выполнения цели.
        """
        if self.target_amount == 0:
            return 0
        return int((self.current_amount / self.target_amount) * 100)