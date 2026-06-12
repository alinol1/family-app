from rest_framework import serializers

from families.models import FamilyMember
from .models import (
    FamilyTreePerson,
    ParentChildRelation,
    Partnership,
    SiblingRelation,
    FamilyTreePersonalLabel,
)


class FamilyTreePersonSerializer(serializers.ModelSerializer):
    linked_user_id = serializers.IntegerField(
        source='linked_user.id',
        read_only=True
    )

    is_current_user = serializers.SerializerMethodField()
    personal_label = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = FamilyTreePerson
        fields = [
            'id',
            'linked_user_id',
            'is_current_user',
            'first_name',
            'last_name',
            'middle_name',
            'gender',
            'birth_date',
            'death_date',
            'photo_url',
            'note',
            'personal_label',
            'created_at',
            'updated_at',
        ]

    def get_is_current_user(self, obj):
        request = self.context.get('request')
        return bool(request and obj.linked_user_id == request.user.id)

    def get_personal_label(self, obj):
        request = self.context.get('request')

        if not request:
            return ''

        label = obj.personal_labels.filter(user=request.user).first()
        return label.label if label else ''

    def get_photo_url(self, obj):
        request = self.context.get('request')

        if obj.photo:
            try:
                url = obj.photo.url
            except Exception:
                url = ''

            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)

            return url

        return obj.photo_url or ''


class ParentChildRelationSerializer(serializers.ModelSerializer):
    parent_id = serializers.IntegerField(source='parent.id', read_only=True)
    child_id = serializers.IntegerField(source='child.id', read_only=True)

    class Meta:
        model = ParentChildRelation
        fields = [
            'id',
            'parent_id',
            'child_id',
            'relation_type',
            'created_at',
        ]


class PartnershipSerializer(serializers.ModelSerializer):
    partner1_id = serializers.IntegerField(source='partner1.id', read_only=True)
    partner2_id = serializers.IntegerField(source='partner2.id', read_only=True)

    class Meta:
        model = Partnership
        fields = [
            'id',
            'partner1_id',
            'partner2_id',
            'status',
            'start_date',
            'end_date',
            'created_at',
        ]


class SiblingRelationSerializer(serializers.ModelSerializer):
    person1_id = serializers.IntegerField(source='person1.id', read_only=True)
    person2_id = serializers.IntegerField(source='person2.id', read_only=True)

    class Meta:
        model = SiblingRelation
        fields = [
            'id',
            'person1_id',
            'person2_id',
            'created_at',
        ]


class FamilyMemberAccountSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'user_id',
            'first_name',
            'last_name',
            'avatar',
            'role',
        ]


class FamilyTreePersonCreateSerializer(serializers.Serializer):
    linked_user_id = serializers.IntegerField(required=False, allow_null=True)

    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)

    gender = serializers.ChoiceField(
        choices=['male', 'female', 'unknown'],
        required=False,
        default='unknown'
    )

    birth_date = serializers.DateField(required=False, allow_null=True)
    death_date = serializers.DateField(required=False, allow_null=True)

    photo_url = serializers.URLField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)

    personal_label = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True
    )


class AddRelativeSerializer(FamilyTreePersonCreateSerializer):
    relation_type = serializers.ChoiceField(
        choices=[
            'mother',
            'father',
            'parent',
            'child',
            'partner',
            'sibling',
        ]
    )


class PersonalLabelSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=100, required=False, allow_blank=True)


class FamilyTreePersonPhotoSerializer(serializers.Serializer):
    photo = serializers.ImageField(required=True)