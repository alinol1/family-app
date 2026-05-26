from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import FamilyPresenceView
from .views import UserMedicalInfoView
from .views import UserAvatarView
from .views import (
    RegisterView,
    LoginView,
    UserProfileView,
    ChangePasswordView,
    LogoutView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),

    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('logout/', LogoutView.as_view(), name='logout'),

    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('presence/family/', FamilyPresenceView.as_view(), name='family_presence'),
    path('medical-info/', UserMedicalInfoView.as_view(), name='my_medical_info'),
    path('medical-info/<int:user_id>/', UserMedicalInfoView.as_view(), name='user_medical_info'),

    path('profile/avatar/', UserAvatarView.as_view(), name='profile_avatar'),
]