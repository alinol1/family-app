from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from families.models import FamilyMember
from users.models import User
from .models import (
    FamilyTreePerson,
    ParentChildRelation,
    Partnership,
    SiblingRelation,
    FamilyTreePersonalLabel,
)
from .serializers import (
    FamilyTreePersonSerializer,
    ParentChildRelationSerializer,
    PartnershipSerializer,
    SiblingRelationSerializer,
    FamilyMemberAccountSerializer,
    FamilyTreePersonCreateSerializer,
    AddRelativeSerializer,
    PersonalLabelSerializer,
    FamilyTreePersonPhotoSerializer,
)


def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def get_person_or_404(person_id, family):
    return FamilyTreePerson.objects.filter(
        id=person_id,
        family=family
    ).first()


def parse_person_name_from_user(user):
    return {
        'first_name': user.first_name or user.username,
        'last_name': user.last_name or '',
        'middle_name': '',
    }


def get_linked_user_for_family(linked_user_id, family):
    if not linked_user_id:
        return None, None

    linked_user = User.objects.filter(id=linked_user_id).first()

    if not linked_user:
        return None, Response(
            {'error': 'Пользователь не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    is_family_member = FamilyMember.objects.filter(
        family=family,
        user=linked_user
    ).exists()

    if not is_family_member:
        return None, Response(
            {'error': 'Пользователь не состоит в вашей семье'},
            status=status.HTTP_400_BAD_REQUEST
        )

    already_linked = FamilyTreePerson.objects.filter(
        linked_user=linked_user
    ).exists()

    if already_linked:
        return None, Response(
            {'error': 'Этот аккаунт уже связан с карточкой человека'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return linked_user, None


def create_person_from_validated_data(validated_data, family, request_user):
    linked_user_id = validated_data.get('linked_user_id')
    linked_user, error = get_linked_user_for_family(linked_user_id, family)

    if error:
        return None, error

    if linked_user:
        user_name = parse_person_name_from_user(linked_user)

        first_name = validated_data.get('first_name') or user_name['first_name']
        last_name = validated_data.get('last_name') or user_name['last_name']
        middle_name = validated_data.get('middle_name') or ''
    else:
        first_name = validated_data.get('first_name', '').strip()
        last_name = validated_data.get('last_name', '').strip()
        middle_name = validated_data.get('middle_name', '').strip()

        if not first_name:
            return None, Response(
                {'error': 'Введите имя человека'},
                status=status.HTTP_400_BAD_REQUEST
            )

    person = FamilyTreePerson.objects.create(
        family=family,
        linked_user=linked_user,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        gender=validated_data.get('gender', 'unknown'),
        birth_date=validated_data.get('birth_date'),
        death_date=validated_data.get('death_date'),
        photo_url=validated_data.get('photo_url', ''),
        note=validated_data.get('note', ''),
        added_by=request_user,
    )

    personal_label = validated_data.get('personal_label', '').strip()

    if personal_label:
        FamilyTreePersonalLabel.objects.update_or_create(
            user=request_user,
            person=person,
            defaults={'label': personal_label}
        )

    return person, None


def serialize_tree(family, request):
    persons = FamilyTreePerson.objects.filter(family=family).prefetch_related(
        'personal_labels'
    )

    parent_child_relations = ParentChildRelation.objects.filter(family=family)
    partnerships = Partnership.objects.filter(family=family)
    sibling_relations = SiblingRelation.objects.filter(family=family)
    family_members = FamilyMember.objects.filter(family=family).select_related('user')

    linked_user_ids = set(
        persons.exclude(linked_user__isnull=True).values_list('linked_user_id', flat=True)
    )

    return {
        'current_user_id': request.user.id,
        'persons': FamilyTreePersonSerializer(
            persons,
            many=True,
            context={'request': request}
        ).data,
        'parent_child_relations': ParentChildRelationSerializer(
            parent_child_relations,
            many=True
        ).data,
        'partnerships': PartnershipSerializer(
            partnerships,
            many=True
        ).data,
        'sibling_relations': SiblingRelationSerializer(
            sibling_relations,
            many=True
        ).data,
        'family_members': FamilyMemberAccountSerializer(
            family_members,
            many=True
        ).data,
        'linked_user_ids': list(linked_user_ids),
    }


def relation_error_response(error):
    if isinstance(error, ValidationError):
        if hasattr(error, 'messages') and error.messages:
            return Response(
                {'error': error.messages[0]},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {'error': str(error)},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response(
        {'error': 'Не удалось создать связь'},
        status=status.HTTP_400_BAD_REQUEST
    )


def create_parent_child_relation(family, parent, child, relation_type='biological'):
    if parent.id == child.id:
        raise ValidationError('Человек не может быть родителем самому себе.')

    if parent.family_id != family.id or child.family_id != family.id:
        raise ValidationError('Люди должны быть из одной семьи.')

    if ParentChildRelation.objects.filter(
        family=family,
        parent=child,
        child=parent
    ).exists():
        raise ValidationError('Нельзя создать циклическую связь родитель-ребёнок.')

    relation, _ = ParentChildRelation.objects.get_or_create(
        family=family,
        parent=parent,
        child=child,
        defaults={'relation_type': relation_type}
    )

    return relation


def create_partnership_relation(family, partner1, partner2):
    if partner1.id == partner2.id:
        raise ValidationError('Человек не может быть партнёром самому себе.')

    if partner1.family_id != family.id or partner2.family_id != family.id:
        raise ValidationError('Люди должны быть из одной семьи.')

    partnership = Partnership.objects.create(
        family=family,
        partner1=partner1,
        partner2=partner2,
        status='relationship'
    )

    return partnership


def create_sibling_relation(family, person1, person2):
    if person1.id == person2.id:
        raise ValidationError('Человек не может быть братом/сестрой самому себе.')

    if person1.family_id != family.id or person2.family_id != family.id:
        raise ValidationError('Люди должны быть из одной семьи.')

    sibling_relation = SiblingRelation.objects.create(
        family=family,
        person1=person1,
        person2=person2
    )

    return sibling_relation


class FamilyTreeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(serialize_tree(family, request))


class FamilyTreePersonCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @transaction.atomic
    def post(self, request):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = FamilyTreePersonCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        person, error = create_person_from_validated_data(
            serializer.validated_data,
            family,
            request.user
        )

        if error:
            transaction.set_rollback(True)
            return error

        return Response(
            serialize_tree(family, request),
            status=status.HTTP_201_CREATED
        )


class FamilyTreePersonDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = get_person_or_404(person_id, family)

        if not person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FamilyTreePersonSerializer(
            person,
            context={'request': request}
        )

        return Response(serializer.data)

    def patch(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = get_person_or_404(person_id, family)

        if not person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        allowed_fields = [
            'first_name',
            'last_name',
            'middle_name',
            'gender',
            'birth_date',
            'death_date',
            'photo_url',
            'note',
        ]

        for field in allowed_fields:
            if field in request.data:
                setattr(person, field, request.data.get(field))

        person.save()

        return Response(
            FamilyTreePersonSerializer(
                person,
                context={'request': request}
            ).data
        )

    def delete(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = get_person_or_404(person_id, family)

        if not person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        person.delete()

        return Response(
            serialize_tree(family, request),
            status=status.HTTP_200_OK
        )


class FamilyTreePersonPhotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = get_person_or_404(person_id, family)

        if not person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FamilyTreePersonPhotoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if person.photo:
            person.photo.delete(save=False)

        person.photo = serializer.validated_data['photo']
        person.photo_url = ''
        person.save()

        return Response(
            FamilyTreePersonSerializer(
                person,
                context={'request': request}
            ).data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = get_person_or_404(person_id, family)

        if not person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        if person.photo:
            person.photo.delete(save=False)

        person.photo = None
        person.photo_url = ''
        person.save()

        return Response(
            FamilyTreePersonSerializer(
                person,
                context={'request': request}
            ).data,
            status=status.HTTP_200_OK
        )


class FamilyTreeAddRelativeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @transaction.atomic
    def post(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_person = get_person_or_404(person_id, family)

        if not target_person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = AddRelativeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        relation_type = data['relation_type']

        if relation_type == 'mother':
            data['gender'] = 'female'

        if relation_type == 'father':
            data['gender'] = 'male'

        new_person, error = create_person_from_validated_data(
            data,
            family,
            request.user
        )

        if error:
            transaction.set_rollback(True)
            return error

        try:
            if relation_type in ['mother', 'father', 'parent']:
                existing_parents = ParentChildRelation.objects.filter(
                    family=family,
                    child=target_person
                ).select_related('parent')

                if relation_type == 'mother':
                    if existing_parents.filter(parent__gender='female').exists():
                        transaction.set_rollback(True)
                        return Response(
                            {'error': 'У этого человека уже указана мама'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                if relation_type == 'father':
                    if existing_parents.filter(parent__gender='male').exists():
                        transaction.set_rollback(True)
                        return Response(
                            {'error': 'У этого человека уже указан папа'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                create_parent_child_relation(
                    family=family,
                    parent=new_person,
                    child=target_person,
                    relation_type='guardian' if relation_type == 'parent' else 'biological'
                )

            elif relation_type == 'child':
                create_parent_child_relation(
                    family=family,
                    parent=target_person,
                    child=new_person,
                    relation_type='biological'
                )

                target_partner_relation = Partnership.objects.filter(
                    family=family,
                ).filter(
                    partner1=target_person
                ).first() or Partnership.objects.filter(
                    family=family,
                    partner2=target_person
                ).first()

                if target_partner_relation:
                    second_parent = (
                        target_partner_relation.partner2
                        if target_partner_relation.partner1_id == target_person.id
                        else target_partner_relation.partner1
                    )

                    create_parent_child_relation(
                        family=family,
                        parent=second_parent,
                        child=new_person,
                        relation_type='biological'
                    )

            elif relation_type == 'partner':
                create_partnership_relation(
                    family=family,
                    partner1=target_person,
                    partner2=new_person
                )

            elif relation_type == 'sibling':
                parent_relations = ParentChildRelation.objects.filter(
                    family=family,
                    child=target_person
                )

                if parent_relations.exists():
                    for parent_relation in parent_relations:
                        create_parent_child_relation(
                            family=family,
                            parent=parent_relation.parent,
                            child=new_person,
                            relation_type=parent_relation.relation_type
                        )

                create_sibling_relation(
                    family=family,
                    person1=target_person,
                    person2=new_person
                )

        except (ValidationError, IntegrityError) as error:
            transaction.set_rollback(True)
            return relation_error_response(error)

        return Response(
            serialize_tree(family, request),
            status=status.HTTP_201_CREATED
        )


class FamilyTreePersonalLabelView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, person_id):
        family = get_user_family(request.user)

        if not family:
            return Response(
                {'error': 'Вы не состоите в семье'},
                status=status.HTTP_400_BAD_REQUEST
            )

        person = get_person_or_404(person_id, family)

        if not person:
            return Response(
                {'error': 'Человек не найден'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PersonalLabelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        label = serializer.validated_data.get('label', '').strip()

        FamilyTreePersonalLabel.objects.update_or_create(
            user=request.user,
            person=person,
            defaults={'label': label}
        )

        return Response(
            serialize_tree(family, request),
            status=status.HTTP_200_OK
        )