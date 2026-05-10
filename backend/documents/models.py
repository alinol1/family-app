from django.db import models
from users.models import User
from families.models import Family


class Document(models.Model):
    """
    Модель документа.
    Семейный архив важных документов с гибким доступом.
    """

    CATEGORY_CHOICES = [
        ('personal', 'Личные'),
        ('medical', 'Медицина'),
        ('family', 'Семейные'),
        ('property', 'Имущество'),
        ('education', 'Образование'),
        ('other', 'Другое'),
    ]

    ACCESS_CHOICES = [
        ('owner', 'Только я'),
        ('family', 'Всей семье'),
        ('selected', 'Выбранным участникам'),
    ]

    title = models.CharField(
        max_length=100,
        verbose_name='Название'
    )

    doc_type = models.CharField(
        max_length=10,
        choices=CATEGORY_CHOICES,
        default='other',
        verbose_name='Тип документа'
    )

    file = models.FileField(
        upload_to='documents/',
        verbose_name='Файл'
    )

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='uploaded_documents',
        verbose_name='Загрузил'
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_documents',
        null=True,
        blank=True,
        verbose_name='Владелец'
    )

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Семья'
    )

    access = models.CharField(
        max_length=10,
        choices=ACCESS_CHOICES,
        default='owner',
        verbose_name='Доступ'
    )

    shared_with = models.ManyToManyField(
        User,
        blank=True,
        related_name='shared_documents',
        verbose_name='Доступ открыт для'
    )

    is_family_doc = models.BooleanField(
        default=False,
        verbose_name='Общий документ семьи'
    )

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
        Проверяет, имеет ли пользователь доступ к документу.
        """

        if not user or not user.is_authenticated:
            return False

        if not hasattr(user, 'family_membership'):
            return False

        # Нельзя смотреть документы чужой семьи
        if user.family_membership.family_id != self.family_id:
            return False

        # Владелец и загрузивший всегда имеют доступ
        if self.owner_id == user.id or self.uploaded_by_id == user.id:
            return True

        # Общий семейный документ доступен всем членам семьи
        if self.is_family_doc:
            return True

        # Документ доступен всей семье
        if self.access == 'family':
            return True

        # Документ доступен выбранным участникам
        if self.access == 'selected':
            return self.shared_with.filter(id=user.id).exists()

        return False

    def user_can_edit(self, user):
        """
        Проверяет, может ли пользователь редактировать документ.
        """

        if not user or not user.is_authenticated:
            return False

        if not hasattr(user, 'family_membership'):
            return False

        if user.family_membership.family_id != self.family_id:
            return False

        # Владелец или загрузивший может редактировать
        if self.owner_id == user.id or self.uploaded_by_id == user.id:
            return True

        return False

    def user_can_manage_access(self, user):
        """
        Проверяет, может ли пользователь менять доступ.
        Доступ можно менять только у личных документов.
        """

        if not self.user_can_edit(user):
            return False

        if self.is_family_doc:
            return False

        return True