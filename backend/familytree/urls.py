from django.urls import path
from .views import (
    FamilyTreeView,
    AddFamilyTreeNodeView,
    FamilyTreeNodeDetailView,
)

urlpatterns = [
    # Всё древо
    path('', FamilyTreeView.as_view(), name='family_tree'),

    # Добавить элемент
    path('add/', AddFamilyTreeNodeView.as_view(), name='add_node'),

    # Просмотр, редактирование, удаление
    path('<int:node_id>/', FamilyTreeNodeDetailView.as_view(), name='node_detail'),
]