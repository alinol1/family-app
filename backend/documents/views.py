from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Document
from .serializers import DocumentSerializer


class FamilyDocumentsView(APIView):
    """
    Общие документы семьи.
    GET /api/documents/family/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Только общие документы семьи
        documents = Document.objects.filter(
            family=family,
            is_family_doc=True
        )

        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)


class MyDocumentsView(APIView):
    """
    Мои документы.
    GET /api/documents/my/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Документы, где я владелец
        documents = Document.objects.filter(
            family=family,
            owner=request.user,
            is_family_doc=False
        )

        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)


class SharedWithMeView(APIView):
    """
    Документы доступные мне.
    GET /api/documents/shared/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        documents = []
        all_docs = Document.objects.filter(
            family=family,
            is_family_doc=False
        ).exclude(owner=request.user)

        for doc in all_docs:
            if doc.user_has_access(request.user):
                documents.append(doc)

        serializer = DocumentSerializer(documents, many=True)
        return Response(serializer.data)


class UploadDocumentView(APIView):
    """
    Загрузка нового документа.
    POST /api/documents/upload/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        serializer = DocumentSerializer(data=request.data)

        if serializer.is_valid():
            document = serializer.save(
                uploaded_by=request.user,
                family=family
            )

            # Если выбраны конкретные пользователи
            shared_with = request.data.getlist('shared_with')
            if shared_with:
                document.shared_with.set(shared_with)

            return Response(
                DocumentSerializer(document).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class DocumentDetailView(APIView):
    """
    Просмотр и удаление документа.
    GET /api/documents/<document_id>/
    DELETE /api/documents/<document_id>/
    """
    permission_classes = [IsAuthenticated]

    def get_document(self, document_id, user):
        try:
            doc = Document.objects.get(id=document_id)
            if not doc.user_has_access(user):
                return None, Response(
                    {'error': 'Нет доступа к документу'},
                    status=status.HTTP_403_FORBIDDEN
                )
            return doc, None
        except Document.DoesNotExist:
            return None, Response(
                {'error': 'Документ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

    def get(self, request, document_id):
        doc, error = self.get_document(document_id, request.user)
        if error:
            return error

        serializer = DocumentSerializer(doc)
        return Response(serializer.data)

    def delete(self, request, document_id):
        doc, error = self.get_document(document_id, request.user)
        if error:
            return error

        # Удалить может только владелец
        if doc.owner != request.user and doc.uploaded_by != request.user:
            return Response(
                {'error': 'Только владелец может удалить документ'},
                status=status.HTTP_403_FORBIDDEN
            )

        doc.delete()
        return Response(
            {'message': 'Документ удалён'},
            status=status.HTTP_200_OK
        )