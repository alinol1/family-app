from django.urls import path

from .views import (
    ActivityOverviewView,
    FamilyTaskListCreateView,
    FamilyTaskDetailView,
    ShoppingItemListCreateView,
    ShoppingItemDetailView,
)

urlpatterns = [
    path('', ActivityOverviewView.as_view(), name='activity_overview'),

    path('tasks/', FamilyTaskListCreateView.as_view(), name='activity_task_create'),
    path('tasks/<int:task_id>/', FamilyTaskDetailView.as_view(), name='activity_task_detail'),

    path('shopping/', ShoppingItemListCreateView.as_view(), name='shopping_item_create'),
    path('shopping/<int:item_id>/', ShoppingItemDetailView.as_view(), name='shopping_item_detail'),
]