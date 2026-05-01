from rest_framework import serializers
from .models import FamilyTreeNode


class FamilyTreeNodeSerializer(serializers.ModelSerializer):
    """
    Сериализатор элемента семейного древа.
    """

    # Возраст (вычисляется автоматически)
    age = serializers.IntegerField(read_only=True)

    # Имя родителя
    parent_name = serializers.SerializerMethodField()

    # Имя супруга
    spouse_name = serializers.SerializerMethodField()

    # Дети
    children = serializers.SerializerMethodField()

    # Пол текстом
    gender_display = serializers.CharField(
        source='get_gender_display',
        read_only=True
    )

    class Meta:
        model = FamilyTreeNode
        fields = [
            'id',
            'full_name',
            'birth_date',
            'gender',
            'gender_display',
            'photo',
            'about',
            'parent',
            'parent_name',
            'spouse',
            'spouse_name',
            'children',
            'linked_user',
            'age',
            'family',
            'added_by',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'family',
            'added_by',
            'created_at',
        ]

    def get_parent_name(self, obj):
        if obj.parent:
            return obj.parent.full_name
        return None

    def get_spouse_name(self, obj):
        if obj.spouse:
            return obj.spouse.full_name
        return None

    def get_children(self, obj):
        children = obj.children.all()
        return [
            {
                'id': child.id,
                'full_name': child.full_name,
                'photo': child.photo.url if child.photo else None,
            }
            for child in children
        ]