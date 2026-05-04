from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации.
    Принимает данные нового пользователя.
    """

    # Поле пароля
    password = serializers.CharField(
        write_only=True,        # пароль не возвращается в ответе
        required=True,
        validators=[validate_password]
    )

    # Подтверждение пароля
    password2 = serializers.CharField(
        write_only=True,
        required=True
    )

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'password2',
            'phone',
            'role',
        ]

    def validate(self, attrs):
        """
        Проверяем что пароли совпадают.
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {'password': 'Пароли не совпадают'}
            )
        return attrs

    def create(self, validated_data):
        """
        Создаём нового пользователя.
        """
        # Удаляем password2 — он нам больше не нужен
        validated_data.pop('password2')

        # Создаём пользователя
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=validated_data.get('phone', ''),
            role=validated_data.get('role', 'adult'),
            password=validated_data['password']
        )

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Сериализатор профиля пользователя.
    Для просмотра и редактирования профиля.
    """

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'avatar',
            'role',
            'blood_type',
            'allergies',
            'medical_notes',
            'date_joined',
        ]

        # Эти поля нельзя изменить через профиль
        read_only_fields = [
            'id',
            'username',
            'email',
            'date_joined',
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """
    Сериализатор для смены пароля.
    """

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password]
    )
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError(
                {'new_password': 'Пароли не совпадают'}
            )
        return attrs
    
class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Запрос на сброс пароля — принимает email.
    """
    email = serializers.EmailField(required=True)


class PasswordResetVerifySerializer(serializers.Serializer):
    """
    Проверка кода сброса.
    """
    email = serializers.EmailField(required=True)
    code = serializers.CharField(max_length=6, required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Установка нового пароля.
    """
    email = serializers.EmailField(required=True)
    code = serializers.CharField(max_length=6, required=True)
    new_password = serializers.CharField(required=True)
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError(
                {'new_password': 'Пароли не совпадают'}
            )
        return attrs