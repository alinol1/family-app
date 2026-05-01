from django.urls import path
from .views import (
    FamilyDocumentsView,
    MyDocumentsView,
    SharedWithMeView,
    UploadDocumentView,
    DocumentDetailView,
)

urlpatterns = [
    # Общие документы семьи
    path('family/', FamilyDocumentsView.as_view(), name='family_docs'),

    # Мои документы
    path('my/', MyDocumentsView.as_view(), name='my_docs'),

    # Доступно мне
    path('shared/', SharedWithMeView.as_view(), name='shared_docs'),

    # Загрузить документ
    path('upload/', UploadDocumentView.as_view(), name='upload_doc'),

    # Просмотр и удаление
    path('<int:document_id>/', DocumentDetailView.as_view(), name='doc_detail'),
]