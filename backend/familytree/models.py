from django.db import models
from users.models import User
from families.models import Family


class FamilyTreeNode(models.Model):
    """
    Элемент семейного древа.
    Представляет одного человека в генеалогическом дереве.
    """

    # Пол
    GENDER_CHOICES = [
        ('male', 'Мужской'),
        ('female', 'Женский'),
        ('other', 'Другой'),
    ]

    # Полное имя человека
    full_name = models.CharField(
        max_length=150,
        verbose_name='Полное имя'
    )

    # Дата рождения
    birth_date = models.DateField(
        blank=True,
        null=True,
        verbose_name='Дата рождения'
    )

    # Пол
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        null=True,
        verbose_name='Пол'
    )

    # Фото человека
    photo = models.ImageField(
        upload_to='familytree/',
        blank=True,
        null=True,
        verbose_name='Фото'
    )

    # Краткая информация о человеке
    about = models.TextField(
        blank=True,
        null=True,
        verbose_name='О человеке'
    )

    # Родительский элемент
    # Если это дочерний элемент — указываем родителя
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Родитель'
    )

    # Супруг(а)
    # Связь между супругами
    spouse = models.OneToOneField(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='spouse_of',
        verbose_name='Супруг(а)'
    )

    # Привязан ли этот элемент к аккаунту пользователя
    linked_user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tree_node',
        verbose_name='Аккаунт пользователя'
    )

    # Семья
    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='tree_nodes',
        verbose_name='Семья'
    )

    # Кто добавил этот элемент
    added_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='added_tree_nodes',
        verbose_name='Кто добавил'
    )

    # Дата добавления
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата добавления'
    )

    class Meta:
        verbose_name = 'Элемент древа'
        verbose_name_plural = 'Элементы древа'

    def __str__(self):
        return self.full_name

    @property
    def age(self):
        """
        Возраст человека (если указана дата рождения)
        """
        if not self.birth_date:
            return None
        from datetime import date
        today = date.today()
        age = today.year - self.birth_date.year
        if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
            age -= 1
        return age