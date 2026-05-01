from django.urls import path
from .views import (
    CategoryListView,
    FinanceRecordListView,
    FamilyBalanceView,
    FinanceStatisticsView,
    FamilyGoalView,
)

urlpatterns = [
    # Категории
    path('categories/', CategoryListView.as_view(), name='categories'),

    # Записи
    path('records/', FinanceRecordListView.as_view(), name='records'),

    # Баланс
    path('balance/', FamilyBalanceView.as_view(), name='balance'),

    # Статистика
    path('statistics/', FinanceStatisticsView.as_view(), name='statistics'),

    # Семейная цель
    path('goal/', FamilyGoalView.as_view(), name='goal'),
]