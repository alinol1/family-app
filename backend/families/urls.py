from django.urls import path
from .views import (
    CreateFamilyView,
    JoinFamilyView,
    LeaveFamilyView,
    RemoveMemberView,
    MyFamilyView,
)

urlpatterns = [
    path('create/', CreateFamilyView.as_view(), name='create_family'),
    path('join/', JoinFamilyView.as_view(), name='join_family'),
    path('my/', MyFamilyView.as_view(), name='my_family'),
    path('leave/', LeaveFamilyView.as_view(), name='leave_family'),
    path('members/<int:user_id>/', RemoveMemberView.as_view(), name='remove_member'),
]