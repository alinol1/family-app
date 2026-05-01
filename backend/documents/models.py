from django.db import models
from users.models import User
from families.models import Family


class Document(models.Model):
    """
    Модель документа.
    Семейный архив важных документов с гибким доступом.
    """

    # Типы документов
    CATEGORY_CHOICES = [
        ('personal', 'Личные'),
        ('medical', 'Медицина'),
        ('family', 'Семейные'),
        ('property', 'Имущество'),
        ('education', 'Образование'),
        ('other', 'Другое'),
    ]

    # Уровень доступа
    ACCESS_CHOICES = [
        ('owner', 'Только я'),
        ('family', 'Всей семье'),
        ('selected', 'Выбранным участникам'),
    ]

    # Название документа
    title = models.CharField(
        max_length=100,
        verbose_name='Название'
    )

    # Тип документа
    doc_type = models.CharField(
        max_length=10,
        choices=CATEGORY_CHOICES,
        default='other',
        verbose_name='Тип документа'
    )

    # Файл (фото/скан)
    file = models.FileField(
        upload_to='documents/',
        verbose_name='Файл'
    )

    # Кто загрузил документ
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_documents',
        verbose_name='Загрузил'
    )

    # Владелец документа (чей это документ)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_documents',
        null=True,
        blank=True,
        verbose_name='Владелец'
    )

    # Семья
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Семья'
    )

    # Уровень доступа
    access = models.CharField(
        max_length=10,
        choices=ACCESS_CHOICES,
        default='owner',
        verbose_name='Доступ'
    )

    # Кому именно открыт доступ (только при access='selected')
    shared_with = models.ManyToManyField(
        User,
        blank=True,
        related_name='shared_documents',
        verbose_name='Доступ открыт для'
    )

    # Это общий семейный документ?
    is_family_doc = models.BooleanField(
        default=False,
        verbose_name='Общий документ семьи'
    )

    # Дата загрузки
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата загрузки'
    )

    class Meta:
        verbose_name = 'Документ'
        verbose_name_plural = 'Документы'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.uploaded_by.first_name}'

    def user_has_access(self, user):
        """
        Проверяет, имеет ли конкретный пользователь
        доступ к этому документу.
        """
        # Владелец всегда имеет доступ
        if self.owner == user or self.uploaded_by == user:
            return True

        # Общий семейный документ — доступен всем
        if self.is_family_doc:
            return True

        # Доступ для всей семьи
        if self.access == 'family':
            return True

        # Доступ для выбранных участников
        if self.access == 'selected':
            return user in self.shared_with.all()

        # По умолчанию — нет доступа
        return False