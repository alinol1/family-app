from rest_framework import serializers
from .models import Family, FamilyMember
from users.models import User


class FamilyMemberSerializer(serializers.ModelSerializer):
    """
    Сериализатор участника семьи.
    """

    # Данные пользователя
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)

    class Meta:
        model = FamilyMember
        fields = [
            'id',
            'user_id',
            'first_name',
            'last_name',
            'avatar',
            'role',
            'phone',
            'joined_at',
        ]


class FamilySerializer(serializers.ModelSerializer):
    """
    Сериализатор семьи.
    """

    # Список участников
    members = FamilyMemberSerializer(many=True, read_only=True)

    # Имя администратора
    admin_name = serializers.SerializerMethodField()

    class Meta:
        model = Family
        fields = [
            'id',
            'name',
            'invite_code',
            'admin',
            'admin_name',
            'members',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'invite_code',
            'admin',
            'created_at',
        ]

    def get_admin_name(self, obj):
        return f'{obj.admin.first_name} {obj.admin.last_name}'


class CreateFamilySerializer(serializers.ModelSerializer):
    """
    Сериализатор для создания семьи.
    Только название — остальное система заполняет сама.
    """

    class Meta:
        model = Family
        fields = ['name']


class JoinFamilySerializer(serializers.Serializer):
    """
    Сериализатор для присоединения к семье по коду.
    """

    invite_code = serializers.CharField(
        max_length=6,
        min_length=6
    )