from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """
    Сериализатор документа.
    """

    uploaded_by_name = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    doc_type_display = serializers.CharField(
        source='get_doc_type_display',
        read_only=True
    )

    access_display = serializers.CharField(
        source='get_access_display',
        read_only=True
    )

    shared_with_names = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'doc_type',
            'doc_type_display',
            'file',
            'file_url',
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
            'file_url',
        ]

    def get_uploaded_by_name(self, obj):
        name = f'{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}'.strip()
        return name or obj.uploaded_by.username

    def get_owner_name(self, obj):
        if not obj.owner:
            return None

        name = f'{obj.owner.first_name} {obj.owner.last_name}'.strip()
        return name or obj.owner.username

    def get_shared_with_names(self, obj):
        return [
            {
                'id': user.id,
                'name': f'{user.first_name} {user.last_name}'.strip() or user.username,
            }
            for user in obj.shared_with.all()
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')

        if not obj.file:
            return None

        if request:
            return request.build_absolute_uri(obj.file.url)

        return obj.file.url


class DocumentUpdateSerializer(serializers.Serializer):
    """
    Обновление документа.
    """

    title = serializers.CharField(
        max_length=100,
        required=False
    )

    access = serializers.ChoiceField(
        choices=['owner', 'family', 'selected'],
        required=False
    )

    shared_with = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )


class SharedOwnerSerializer(serializers.Serializer):
    """
    Сериализатор человека, который предоставил доступ.
    """

    id = serializers.IntegerField()
    name = serializers.CharField()
    documents_count = serializers.IntegerField()
    last_document_title = serializers.CharField(allow_null=True)