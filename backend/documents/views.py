from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from users.models import User
from .models import Document
from .serializers import (
    DocumentSerializer,
    DocumentUpdateSerializer,
)


def get_user_family(user):
    """
    Возвращает семью пользователя.
    """

    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def get_user_name(user):
    """
    Красивое имя пользователя.
    """

    return f'{user.first_name} {user.last_name}'.strip() or user.username


class FamilyDocumentsView(APIView):
    """
    Общие документы семьи.
    GET /api/documents/family/?search=паспорт
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        search = request.query_params.get('search', '').strip()

        documents = Document.objects.filter(
            family=family,
            is_family_doc=True
        )

        if search:
            documents = documents.filter(title__icontains=search)

        serializer = DocumentSerializer(
            documents,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class MyDocumentsView(APIView):
    """
    Личные документы пользователя.
    GET /api/documents/my/?search=паспорт
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        search = request.query_params.get('search', '').strip()

        documents = Document.objects.filter(
            family=family,
            owner=request.user,
            is_family_doc=False
        )

        if search:
            documents = documents.filter(title__icontains=search)

        serializer = DocumentSerializer(
            documents,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class SharedWithMeView(APIView):
    """
    Документы, доступные текущему пользователю.
    GET /api/documents/shared/
    GET /api/documents/shared/?owner_id=5
    GET /api/documents/shared/?search=паспорт
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        search = request.query_params.get('search', '').strip()
        owner_id = request.query_params.get('owner_id')

        documents = Document.objects.filter(
            family=family,
            is_family_doc=False,
            access='selected',
            shared_with=request.user
        ).exclude(
            owner=request.user
        )

        if owner_id:
            documents = documents.filter(owner_id=owner_id)

        if search:
            documents = documents.filter(title__icontains=search)

        serializer = DocumentSerializer(
            documents.distinct(),
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)


class SharedOwnersView(APIView):
    """
    Люди, которые предоставили текущему пользователю доступ.
    GET /api/documents/shared-owners/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        documents = Document.objects.filter(
            family=family,
            is_family_doc=False,
            access='selected',
            shared_with=request.user
        ).exclude(
            owner=request.user
        ).select_related('owner').distinct()

        owners = {}

        for document in documents:
            owner = document.owner or document.uploaded_by

            if not owner:
                continue

            if owner.id not in owners:
                owners[owner.id] = {
                    'id': owner.id,
                    'name': get_user_name(owner),
                    'documents_count': 0,
                    'last_document_title': None,
                }

            owners[owner.id]['documents_count'] += 1

            if not owners[owner.id]['last_document_title']:
                owners[owner.id]['last_document_title'] = document.title

        return Response(list(owners.values()))


class UploadDocumentView(APIView):
    """
    Загрузка нового документа.
    POST /api/documents/upload/

    Для общих документов:
    is_family_doc=true

    Для личных документов:
    is_family_doc=false
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        title = request.data.get('title', '').strip()
        uploaded_file = request.FILES.get('file')
        is_family_doc = str(request.data.get('is_family_doc', 'false')).lower() == 'true'
        doc_type = request.data.get('doc_type', 'family' if is_family_doc else 'personal')

        if not title:
            return Response(
                {'error': 'Название документа обязательно'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not uploaded_file:
            return Response(
                {'error': 'Файл обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if is_family_doc:
            access = 'family'
        else:
            access = request.data.get('access', 'owner')

        document = Document.objects.create(
            title=title,
            doc_type=doc_type,
            file=uploaded_file,
            uploaded_by=request.user,
            owner=request.user,
            family=family,
            access=access,
            is_family_doc=is_family_doc,
        )

        if not is_family_doc and access == 'selected':
            shared_with = request.data.getlist('shared_with')

            allowed_users = User.objects.filter(
                id__in=shared_with,
                family_membership__family=family
            ).exclude(
                id=request.user.id
            )

            document.shared_with.set(allowed_users)

        serializer = DocumentSerializer(
            document,
            context={'request': request}
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class DocumentDetailView(APIView):
    """
    Просмотр, редактирование и удаление документа.
    GET /api/documents/<document_id>/
    PATCH /api/documents/<document_id>/
    DELETE /api/documents/<document_id>/
    """

    permission_classes = [IsAuthenticated]

    def get_document(self, document_id, user):
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return None, Response(
                {'error': 'Документ не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not document.user_has_access(user):
            return None, Response(
                {'error': 'Нет доступа к документу'},
                status=status.HTTP_403_FORBIDDEN
            )

        return document, None

    def get(self, request, document_id):
        document, error = self.get_document(document_id, request.user)

        if error:
            return error

        serializer = DocumentSerializer(
            document,
            context={'request': request}
        )

        return Response(serializer.data)

    def patch(self, request, document_id):
        document, error = self.get_document(document_id, request.user)

        if error:
            return error

        if not document.user_can_edit(request.user):
            return Response(
                {'error': 'Нет прав на редактирование документа'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DocumentUpdateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        title = serializer.validated_data.get('title')
        access = serializer.validated_data.get('access')
        shared_with = serializer.validated_data.get('shared_with')

        if title:
            document.title = title

        if access:
            if document.is_family_doc:
                return Response(
                    {'error': 'У общего документа нельзя менять доступ'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            document.access = access

            if access != 'selected':
                document.shared_with.clear()

        document.save()

        if shared_with is not None:
            if not document.user_can_manage_access(request.user):
                return Response(
                    {'error': 'Нет прав управлять доступом'},
                    status=status.HTTP_403_FORBIDDEN
                )

            family = get_user_family(request.user)

            users = User.objects.filter(
                id__in=shared_with,
                family_membership__family=family
            ).exclude(
                id=request.user.id
            )

            document.access = 'selected'
            document.save()
            document.shared_with.set(users)

        result_serializer = DocumentSerializer(
            document,
            context={'request': request}
        )

        return Response(result_serializer.data)

    def delete(self, request, document_id):
        document, error = self.get_document(document_id, request.user)

        if error:
            return error

        if not document.user_can_edit(request.user):
            return Response(
                {'error': 'Только владелец может удалить документ'},
                status=status.HTTP_403_FORBIDDEN
            )

        document.delete()

        return Response(
            {'message': 'Документ удалён'},
            status=status.HTTP_200_OK
        )
    

class DocumentFamilyMembersView(APIView):
    """
    Члены семьи для настройки доступа к документу.
    GET /api/documents/family-members/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = User.objects.filter(
            family_membership__family=family
        ).exclude(
            id=request.user.id
        )

        data = []

        for user in users:
            name = f'{user.first_name} {user.last_name}'.strip() or user.username

            data.append({
                'id': user.id,
                'name': name,
                'role': user.role,
            })

        return Response(data)