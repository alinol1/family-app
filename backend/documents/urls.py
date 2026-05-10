from django.urls import path
from .views import (
    FamilyDocumentsView,
    MyDocumentsView,
    SharedWithMeView,
    SharedOwnersView,
    UploadDocumentView,
    DocumentDetailView,
)

urlpatterns = [
    # Общие документы семьи
    path('family/', FamilyDocumentsView.as_view(), name='family_docs'),

    # Мои личные документы
    path('my/', MyDocumentsView.as_view(), name='my_docs'),

    # Документы, доступные мне
    path('shared/', SharedWithMeView.as_view(), name='shared_docs'),

    # Люди, которые предоставили мне доступ
    path('shared-owners/', SharedOwnersView.as_view(), name='shared_owners'),

    # Загрузить документ
    path('upload/', UploadDocumentView.as_view(), name='upload_doc'),

    # Просмотр, редактирование, удаление
    path('<int:document_id>/', DocumentDetailView.as_view(), name='doc_detail'),
]