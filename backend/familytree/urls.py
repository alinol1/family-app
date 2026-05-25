from django.urls import path

from .views import (
    FamilyTreeView,
    FamilyTreePersonCreateView,
    FamilyTreePersonDetailView,
    FamilyTreePersonPhotoView,
    FamilyTreeAddRelativeView,
    FamilyTreePersonalLabelView,
)

urlpatterns = [
    path('', FamilyTreeView.as_view(), name='family_tree'),

    path('persons/', FamilyTreePersonCreateView.as_view(), name='tree_person_create'),
    path('persons/<int:person_id>/', FamilyTreePersonDetailView.as_view(), name='tree_person_detail'),
    path('persons/<int:person_id>/photo/', FamilyTreePersonPhotoView.as_view(), name='tree_person_photo'),
    path('persons/<int:person_id>/add-relative/', FamilyTreeAddRelativeView.as_view(), name='tree_person_add_relative'),
    path('persons/<int:person_id>/label/', FamilyTreePersonalLabelView.as_view(), name='tree_person_label'),
]