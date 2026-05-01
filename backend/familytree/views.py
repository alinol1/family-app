from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import FamilyTreeNode
from .serializers import FamilyTreeNodeSerializer


class FamilyTreeView(APIView):
    """
    Всё семейное древо.
    GET /api/tree/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'family_membership'):
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        family = request.user.family_membership.family

        # Все элементы древа семьи
        nodes = FamilyTreeNode.objects.filter(family=family)

        serializer = FamilyTreeNodeSerializer(nodes, many=True)
        return Response(serializer.data)


class AddFamilyTreeNodeView(APIView):
    """
    Добавить члена семьи в древо.
    POST /api/tree/add/
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

        serializer = FamilyTreeNodeSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(
                family=family,
                added_by=request.user
            )
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class FamilyTreeNodeDetailView(APIView):
    """
    Просмотр, редактирование и удаление элемента.
    GET /api/tree/<node_id>/
    PUT /api/tree/<node_id>/
    DELETE /api/tree/<node_id>/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_node(self, node_id, user):
        try:
            family = user.family_membership.family
            node = FamilyTreeNode.objects.get(
                id=node_id,
                family=family
            )
            return node, None
        except FamilyTreeNode.DoesNotExist:
            return None, Response(
                {'error': 'Элемент не найден'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception:
            return None, Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get(self, request, node_id):
        node, error = self.get_node(node_id, request.user)
        if error:
            return error

        serializer = FamilyTreeNodeSerializer(node)
        return Response(serializer.data)

    def put(self, request, node_id):
        node, error = self.get_node(node_id, request.user)
        if error:
            return error

        serializer = FamilyTreeNodeSerializer(
            node,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, node_id):
        node, error = self.get_node(node_id, request.user)
        if error:
            return error

        node.delete()
        return Response(
            {'message': 'Элемент удалён из древа'},
            status=status.HTTP_200_OK
        )