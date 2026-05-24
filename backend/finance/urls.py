from django.urls import path

from .views import (
    FinanceFamilyMembersView,
    FinanceSpaceListCreateView,
    FinanceSpaceDetailView,
    FinanceSpaceMembersView,
    FinanceSpaceSummaryView,
    FinanceSpaceStatisticsView,
    CategoryListCreateView,
    CategoryDetailView,
    FinanceRecordListCreateView,
    FinanceRecordDetailView,
    FinanceGoalListCreateView,
    FinanceGoalDetailView,
    FinanceGoalCompleteView,
    FinanceGoalContributionListCreateView,
)

urlpatterns = [
    path(
        'family-members/',
        FinanceFamilyMembersView.as_view(),
        name='finance_family_members'
    ),

    path(
        'spaces/',
        FinanceSpaceListCreateView.as_view(),
        name='finance_spaces'
    ),

    path(
        'spaces/<int:space_id>/',
        FinanceSpaceDetailView.as_view(),
        name='finance_space_detail'
    ),

    path(
        'spaces/<int:space_id>/members/',
        FinanceSpaceMembersView.as_view(),
        name='finance_space_members'
    ),

    path(
        'spaces/<int:space_id>/summary/',
        FinanceSpaceSummaryView.as_view(),
        name='finance_space_summary'
    ),

    path(
        'spaces/<int:space_id>/statistics/',
        FinanceSpaceStatisticsView.as_view(),
        name='finance_space_statistics'
    ),

    path(
        'spaces/<int:space_id>/categories/',
        CategoryListCreateView.as_view(),
        name='finance_categories'
    ),

    path(
        'spaces/<int:space_id>/categories/<int:category_id>/',
        CategoryDetailView.as_view(),
        name='finance_category_detail'
    ),

    path(
        'spaces/<int:space_id>/records/',
        FinanceRecordListCreateView.as_view(),
        name='finance_records'
    ),

    path(
        'spaces/<int:space_id>/records/<int:record_id>/',
        FinanceRecordDetailView.as_view(),
        name='finance_record_detail'
    ),

    path(
        'spaces/<int:space_id>/goals/',
        FinanceGoalListCreateView.as_view(),
        name='finance_goals'
    ),

    path(
        'spaces/<int:space_id>/goals/<int:goal_id>/',
        FinanceGoalDetailView.as_view(),
        name='finance_goal_detail'
    ),

    path(
        'spaces/<int:space_id>/goals/<int:goal_id>/complete/',
        FinanceGoalCompleteView.as_view(),
        name='finance_goal_complete'
    ),

    path(
        'spaces/<int:space_id>/goals/<int:goal_id>/contributions/',
        FinanceGoalContributionListCreateView.as_view(),
        name='finance_goal_contributions'
    ),
]