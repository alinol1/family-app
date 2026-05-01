from django.urls import path
from .views import (
    CreateFamilyView,
    JoinFamilyView,
    FamilyDetailView,
    LeaveFamilyView,
    RemoveMemberView,
)

urlpatterns = [
    # Создать семью
    path('create/', CreateFamilyView.as_view(), name='create_family'),

    # Присоединиться по коду
    path('join/', JoinFamilyView.as_view(), name='join_family'),

    # Информация о своей семье
    path('my/', FamilyDetailView.as_view(), name='my_family'),

    # Выйти из семьи
    path('leave/', LeaveFamilyView.as_view(), name='leave_family'),

    # Удалить участника
    path('members/<int:user_id>/', RemoveMemberView.as_view(), name='remove_member'),
]