from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from core.throttles import (
    LoginIPThrottle,
    LoginUsernameThrottle,
    RegisterIPThrottle,
    PasswordResetRequestIPThrottle,
    PasswordResetRequestEmailThrottle,
    PasswordResetVerifyIPThrottle,
    PasswordResetVerifyEmailThrottle,
    PasswordResetConfirmIPThrottle,
    PasswordResetConfirmEmailThrottle,
)

from .models import User, PasswordResetCode

from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
)


class LoginView(TokenObtainPairView):
    """
    Вход в аккаунт.
    POST /api/auth/login/

    Ограничения:
    - по IP-адресу;
    - по username.
    """
    throttle_classes = [
        LoginIPThrottle,
        LoginUsernameThrottle,
    ]


class RegisterView(generics.CreateAPIView):
    """
    Регистрация нового пользователя.
    POST /api/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    throttle_classes = [RegisterIPThrottle]
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

            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'old_password': 'Неверный пароль'},
                    status=status.HTTP_400_BAD_REQUEST
                )

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

    Ограничения:
    - по IP-адресу;
    - по email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [
        PasswordResetRequestIPThrottle,
        PasswordResetRequestEmailThrottle,
    ]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)

        if serializer.is_valid():
            email = serializer.validated_data['email'].lower()

            try:
                user = User.objects.get(email=email)

            except User.DoesNotExist:
                return Response(
                    {'message': 'Если аккаунт существует, письмо отправлено'},
                    status=status.HTTP_200_OK
                )

            code = PasswordResetCode.generate_code()

            PasswordResetCode.objects.create(
                user=user,
                code=code
            )

            try:
                send_mail(
                    subject='Маяк — Сброс пароля',
                    message=(
                        f'Ваш код для сброса пароля: {code}\n\n'
                        'Код действителен 15 минут.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )

            except Exception as error:
                print(f'Ошибка отправки email: {error}')

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

    Ограничения:
    - по IP-адресу;
    - по email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [
        PasswordResetVerifyIPThrottle,
        PasswordResetVerifyEmailThrottle,
    ]

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

    Ограничения:
    - по IP-адресу;
    - по email.
    """
    permission_classes = [AllowAny]
    throttle_classes = [
        PasswordResetConfirmIPThrottle,
        PasswordResetConfirmEmailThrottle,
    ]

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
                    {'error': 'Неверный или просроченный код'},
                    status=status.HTTP_400_BAD_REQUEST
                )

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

            user.set_password(new_password)
            user.save()

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