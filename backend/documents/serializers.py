from rest_framework import serializers
from .models import Document
from users.models import User


class DocumentSerializer(serializers.ModelSerializer):
    """
    Сериализатор документа.
    """

    # Имя загрузившего
    uploaded_by_name = serializers.SerializerMethodField()

    # Имя владельца
    owner_name = serializers.SerializerMethodField()

    # Название типа документа
    doc_type_display = serializers.CharField(
        source='get_doc_type_display',
        read_only=True
    )

    # Название уровня доступа
    access_display = serializers.CharField(
        source='get_access_display',
        read_only=True
    )

    # Кому открыт доступ
    shared_with_names = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'doc_type',
            'doc_type_display',
            'file',
            'uploaded_by',
            'uploaded_by_name',
            'owner',
            'owner_name',
            'family',
            'access',
            'access_display',
            'shared_with',
            'shared_with_names',
            'is_family_doc',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'uploaded_by',
            'family',
            'created_at',
        ]

    def get_uploaded_by_name(self, obj):
        return f'{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}'

    def get_owner_name(self, obj):
        if obj.owner:
            return f'{obj.owner.first_name} {obj.owner.last_name}'
        return None

    def get_shared_with_names(self, obj):
        return [
            f'{user.first_name} {user.last_name}'
            for user in obj.shared_with.all()
        ]