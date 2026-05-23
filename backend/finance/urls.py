from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    FinanceRecordListCreateView,
    FinanceRecordDetailView,
    FamilyGoalView,
    FinanceSummaryView,
    FinanceStatisticsView,
)

urlpatterns = [
    path(
        'categories/',
        CategoryListCreateView.as_view(),
        name='finance_categories'
    ),

    path(
        'categories/<int:category_id>/',
        CategoryDetailView.as_view(),
        name='finance_category_detail'
    ),

    path(
        'records/',
        FinanceRecordListCreateView.as_view(),
        name='finance_records'
    ),

    path(
        'records/<int:record_id>/',
        FinanceRecordDetailView.as_view(),
        name='finance_record_detail'
    ),

    path(
        'goal/',
        FamilyGoalView.as_view(),
        name='finance_goal'
    ),

    path(
        'summary/',
        FinanceSummaryView.as_view(),
        name='finance_summary'
    ),

    path(
        'statistics/',
        FinanceStatisticsView.as_view(),
        name='finance_statistics'
    ),
]