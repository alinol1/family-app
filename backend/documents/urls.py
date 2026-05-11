from django.urls import path
from .views import (
    FamilyDocumentsView,
    MyDocumentsView,
    SharedWithMeView,
    SharedOwnersView,
    UploadDocumentView,
    DocumentDetailView,
    DocumentFamilyMembersView,
)

urlpatterns = [
    path('family/', FamilyDocumentsView.as_view(), name='family_docs'),
    path('my/', MyDocumentsView.as_view(), name='my_docs'),
    path('shared/', SharedWithMeView.as_view(), name='shared_docs'),
    path('shared-owners/', SharedOwnersView.as_view(), name='shared_owners'),

    path('family-members/', DocumentFamilyMembersView.as_view(), name='document_family_members'),

    path('upload/', UploadDocumentView.as_view(), name='upload_doc'),
    path('<int:document_id>/', DocumentDetailView.as_view(), name='doc_detail'),
]