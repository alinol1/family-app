from django.core.exceptions import ValidationError
from django.db import models

from users.models import User
from families.models import Family


class FamilyTreePerson(models.Model):
    GENDER_CHOICES = [
        ('male', 'Мужской'),
        ('female', 'Женский'),
        ('unknown', 'Не указано'),
    ]

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='tree_persons',
        verbose_name='Семья'
    )

    linked_user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='family_tree_person',
        verbose_name='Связанный аккаунт'
    )

    first_name = models.CharField(
        max_length=100,
        verbose_name='Имя'
    )

    last_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Фамилия'
    )

    middle_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Отчество'
    )

    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        default='unknown',
        verbose_name='Пол'
    )

    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата рождения'
    )

    death_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата смерти'
    )

    photo = models.ImageField(
        upload_to='family_tree/photos/',
        null=True,
        blank=True,
        verbose_name='Фото'
    )

    photo_url = models.URLField(
        max_length=1000,
        blank=True,
        verbose_name='Ссылка на фото'
    )

    note = models.TextField(
        blank=True,
        verbose_name='Заметка'
    )

    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tree_persons',
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
        verbose_name = 'Человек в семейном древе'
        verbose_name_plural = 'Люди в семейном древе'
        ordering = ['id']

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        parts = [self.last_name, self.first_name, self.middle_name]
        return ' '.join(part for part in parts if part).strip() or 'Без имени'


class ParentChildRelation(models.Model):
    RELATION_TYPE_CHOICES = [
        ('biological', 'Биологическая связь'),
        ('adoptive', 'Приёмная связь'),
        ('guardian', 'Опекунство'),
        ('step', 'Отчим / мачеха'),
    ]

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='parent_child_relations',
        verbose_name='Семья'
    )

    parent = models.ForeignKey(
        FamilyTreePerson,
        on_delete=models.CASCADE,
        related_name='children_relations',
        verbose_name='Родитель'
    )

    child = models.ForeignKey(
        FamilyTreePerson,
        on_delete=models.CASCADE,
        related_name='parent_relations',
        verbose_name='Ребёнок'
    )

    relation_type = models.CharField(
        max_length=30,
        choices=RELATION_TYPE_CHOICES,
        default='biological',
        verbose_name='Тип связи'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Связь родитель-ребёнок'
        verbose_name_plural = 'Связи родитель-ребёнок'
        unique_together = ('parent', 'child')

    def clean(self):
        if self.parent_id and self.child_id and self.parent_id == self.child_id:
            raise ValidationError('Человек не может быть родителем самому себе.')

        if self.parent_id and self.child_id:
            if self.parent.family_id != self.child.family_id:
                raise ValidationError('Родитель и ребёнок должны быть из одной семьи.')

    def save(self, *args, **kwargs):
        self.family = self.parent.family
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.parent} → {self.child}'


class Partnership(models.Model):
    STATUS_CHOICES = [
        ('married', 'Брак'),
        ('relationship', 'Отношения'),
        ('divorced', 'Развод'),
        ('widowed', 'Вдовство'),
    ]

    family = models.ForeignKey(
        Family,
        on_delete=models.CASCADE,
        related_name='partnerships',
        verbose_name='Семья'
    )

    partner1 = models.ForeignKey(
        FamilyTreePerson,
        on_delete=models.CASCADE,
        related_name='partnerships_as_first',
        verbose_name='Партнёр 1'
    )

    partner2 = models.ForeignKey(
        FamilyTreePerson,
        on_delete=models.CASCADE,
        related_name='partnerships_as_second',
        verbose_name='Партнёр 2'
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='relationship',
        verbose_name='Статус'
    )

    start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата начала'
    )

    end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата окончания'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Партнёрская связь'
        verbose_name_plural = 'Партнёрские связи'

    def clean(self):
        if self.partner1_id and self.partner2_id and self.partner1_id == self.partner2_id:
            raise ValidationError('Человек не может быть партнёром самому себе.')

        if self.partner1_id and self.partner2_id:
            if self.partner1.family_id != self.partner2.family_id:
                raise ValidationError('Партнёры должны быть из одной семьи.')

            duplicate = Partnership.objects.filter(
                family=self.partner1.family
            ).filter(
                models.Q(partner1=self.partner1, partner2=self.partner2) |
                models.Q(partner1=self.partner2, partner2=self.partner1)
            )

            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)

            if duplicate.exists():
                raise ValidationError('Такая партнёрская связь уже существует.')

    def save(self, *args, **kwargs):
        self.family = self.partner1.family
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.partner1} ↔ {self.partner2}'


class FamilyTreePersonalLabel(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tree_personal_labels',
        verbose_name='Пользователь'
    )

    person = models.ForeignKey(
        FamilyTreePerson,
        on_delete=models.CASCADE,
        related_name='personal_labels',
        verbose_name='Человек'
    )

    label = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Кто этот человек для пользователя'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Дата обновления'
    )

    class Meta:
        verbose_name = 'Личная подпись человека'
        verbose_name_plural = 'Личные подписи людей'
        unique_together = ('user', 'person')

    def __str__(self):
        return f'{self.user} → {self.person}: {self.label}'