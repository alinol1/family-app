from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer
)

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetCode
from .serializers import (
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
)


class RegisterView(generics.CreateAPIView):
    """
    Регистрация нового пользователя.
    POST /api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Просмотр и редактирование профиля.
    GET /api/auth/profile/
    PUT /api/auth/profile/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    Смена пароля.
    POST /api/auth/change-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)

        if serializer.is_valid():
            user = request.user

            # Проверяем старый пароль
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': 'Неверный пароль'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Устанавливаем новый пароль
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            return Response(
                {'message': 'Пароль успешно изменён'},
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class LogoutView(APIView):
    """
    Выход из аккаунта.
    POST /api/auth/logout/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Получаем refresh token и блокируем его
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {'message': 'Вы успешно вышли из аккаунта'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'error': 'Что-то пошло не так'},
                status=status.HTTP_400_BAD_REQUEST
            )
        

class PasswordResetRequestView(APIView):
    """
    Запрос на сброс пароля.
    POST /api/auth/password-reset/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email'].lower()

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Не говорим что пользователь не найден (безопасность)
                return Response(
                    {'message': 'Если аккаунт существует, письмо отправлено'},
                    status=status.HTTP_200_OK
                )

            # Генерируем код
            code = PasswordResetCode.generate_code()

            # Сохраняем код
            PasswordResetCode.objects.create(
                user=user,
                code=code
            )

            # Отправляем письмо
            try:
                send_mail(
                    subject='Маяк — Сброс пароля',
                    message=f'Ваш код для сброса пароля: {code}\n\nКод действителен 15 минут.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f'Ошибка отправки email: {e}')
                return Response(
                    {'error': 'Не удалось отправить письмо'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {'message': 'Если аккаунт существует, письмо отправлено'},
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetVerifyView(APIView):
    """
    Проверка кода сброса.
    POST /api/auth/password-reset/verify/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email'].lower()
            code = serializer.validated_data['code']

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Неверный код'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Ищем код не старше 15 минут
            reset_code = PasswordResetCode.objects.filter(
                user=user,
                code=code,
                is_used=False,
                created_at__gte=timezone.now() - timedelta(minutes=15)
            ).last()

            if not reset_code:
                return Response(
                    {'error': 'Неверный или просроченный код'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response(
                {'message': 'Код подтверждён'},
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class PasswordResetConfirmView(APIView):
    """
    Установка нового пароля.
    POST /api/auth/password-reset/confirm/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email'].lower()
            code = serializer.validated_data['code']
            new_password = serializer.validated_data['new_password']

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Пользователь не найден'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Проверяем код
            reset_code = PasswordResetCode.objects.filter(
                user=user,
                code=code,
                is_used=False,
                created_at__gte=timezone.now() - timedelta(minutes=15)
            ).last()

            if not reset_code:
                return Response(
                    {'error': 'Неверный или просроченный код'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Меняем пароль
            user.set_password(new_password)
            user.save()

            # Отмечаем код как использованный
            reset_code.is_used = True
            reset_code.save()

            return Response(
                {'message': 'Пароль успешно изменён'},
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )