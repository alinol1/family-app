from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации.
    Клиент не может передавать role.
    По умолчанию новый пользователь создаётся с ролью adult.
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

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
        ]

    def validate_email(self, value):
        email = str(value or '').strip().lower()

        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                'Пользователь с таким email уже существует'
            )

        return email

    def validate_username(self, value):
        username = str(value or '').strip()

        if not username:
            raise serializers.ValidationError(
                'Имя пользователя обязательно'
            )

        return username

    def validate(self, attrs):
        """
        Проверяем, что пароли совпадают.
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
        validated_data.pop('password2')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=str(validated_data.get('first_name', '')).strip(),
            last_name=str(validated_data.get('last_name', '')).strip(),
            phone=str(validated_data.get('phone', '')).strip(),
            role='adult',
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
            'city',
            'avatar',
            'blood_type',
            'allergies',
            'medical_notes',
            'chronic_diseases',
            'medications',
            'emergency_contact_name',
            'emergency_contact_phone',
            'date_joined',
        ]

        read_only_fields = [
            'id',
            'username',
            'date_joined',
        ]

    def validate_email(self, value):
        email = str(value or '').strip().lower()

        if not email:
            return email

        user = self.instance

        qs = User.objects.filter(email__iexact=email)

        if user:
            qs = qs.exclude(id=user.id)

        if qs.exists():
            raise serializers.ValidationError(
                'Пользователь с таким email уже существует'
            )

        return email

    def validate_first_name(self, value):
        return str(value or '').strip()

    def validate_last_name(self, value):
        return str(value or '').strip()

    def validate_phone(self, value):
        return str(value or '').strip()

    def validate_city(self, value):
        return str(value or '').strip()


class ChangePasswordSerializer(serializers.Serializer):
    """
    Сериализатор для смены пароля.
    """

    old_password = serializers.CharField(
        required=True,
        write_only=True
    )

    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password]
    )

    new_password2 = serializers.CharField(
        required=True,
        write_only=True
    )

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

    def validate_email(self, value):
        return str(value or '').strip().lower()


class PasswordResetVerifySerializer(serializers.Serializer):
    """
    Проверка кода сброса.
    """

    email = serializers.EmailField(required=True)
    code = serializers.CharField(
        max_length=6,
        min_length=6,
        required=True
    )

    def validate_email(self, value):
        return str(value or '').strip().lower()

    def validate_code(self, value):
        code = str(value or '').strip()

        if not code.isdigit():
            raise serializers.ValidationError(
                'Код должен состоять из 6 цифр'
            )

        return code


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Установка нового пароля.
    """

    email = serializers.EmailField(required=True)

    code = serializers.CharField(
        max_length=6,
        min_length=6,
        required=True
    )

    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password]
    )

    new_password2 = serializers.CharField(
        required=True,
        write_only=True
    )

    def validate_email(self, value):
        return str(value or '').strip().lower()

    def validate_code(self, value):
        code = str(value or '').strip()

        if not code.isdigit():
            raise serializers.ValidationError(
                'Код должен состоять из 6 цифр'
            )

        return code

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError(
                {'new_password': 'Пароли не совпадают'}
            )

        return attrs