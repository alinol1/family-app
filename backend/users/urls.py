from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView,
    UserProfileView,
    ChangePasswordView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView,
)



urlpatterns = [
    # Регистрация
    path('register/', RegisterView.as_view(), name='register'),

    # Вход (получение токена)
    path('login/', TokenObtainPairView.as_view(), name='login'),

    # Обновление токена
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Профиль
    path('profile/', UserProfileView.as_view(), name='profile'),

    # Смена пароля
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Выход
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # Сброс пароля
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]