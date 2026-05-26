import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

from families.models import FamilyMember
from .models import UserPresence


def get_user_family(user):
    if not user or user.is_anonymous:
        return None

    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')

        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        self.family_id = await self.get_family_id()

        if not self.family_id:
            await self.close()
            return

        self.group_name = f'presence_family_{self.family_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.mark_user_online()

        await self.accept()

        await self.broadcast_presence()

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user and not self.user.is_anonymous:
            await self.mark_user_offline()

            if hasattr(self, 'group_name'):
                await self.broadcast_presence()

        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            data = {}

        event_type = data.get('type')

        if event_type == 'heartbeat':
            await self.update_last_seen()
            await self.broadcast_presence()

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'members': event['members'],
        }))

    async def broadcast_presence(self):
        members = await self.get_family_presence()

        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'presence_update',
                'members': members,
            }
        )

    @database_sync_to_async
    def get_family_id(self):
        family = get_user_family(self.user)

        if not family:
            return None

        return family.id

    @database_sync_to_async
    def mark_user_online(self):
        now = timezone.now()

        presence, _ = UserPresence.objects.get_or_create(
            user=self.user
        )

        presence.connections_count += 1
        presence.is_online = True
        presence.last_seen = now
        presence.save(
            update_fields=[
                'connections_count',
                'is_online',
                'last_seen',
                'updated_at',
            ]
        )

        self.user.last_seen = now
        self.user.save(update_fields=['last_seen'])

    @database_sync_to_async
    def mark_user_offline(self):
        now = timezone.now()

        presence, _ = UserPresence.objects.get_or_create(
            user=self.user
        )

        if presence.connections_count > 0:
            presence.connections_count -= 1

        presence.is_online = presence.connections_count > 0
        presence.last_seen = now
        presence.save(
            update_fields=[
                'connections_count',
                'is_online',
                'last_seen',
                'updated_at',
            ]
        )

        self.user.last_seen = now
        self.user.save(update_fields=['last_seen'])

    @database_sync_to_async
    def update_last_seen(self):
        now = timezone.now()

        presence, _ = UserPresence.objects.get_or_create(
            user=self.user
        )

        presence.is_online = True
        presence.last_seen = now
        presence.save(
            update_fields=[
                'is_online',
                'last_seen',
                'updated_at',
            ]
        )

        self.user.last_seen = now
        self.user.save(update_fields=['last_seen'])

    @database_sync_to_async
    def get_family_presence(self):
        family = get_user_family(self.user)

        if not family:
            return []

        members = FamilyMember.objects.filter(
            family=family
        ).select_related('user')

        data = []

        for member in members:
            user = member.user
            presence = getattr(user, 'presence', None)

            avatar_url = None

            if user.avatar:
                try:
                    avatar_url = user.avatar.url
                except Exception:
                    avatar_url = None

            full_name = f'{user.first_name} {user.last_name}'.strip()

            data.append({
                'user_id': user.id,
                'full_name': full_name or user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'avatar_url': avatar_url,
                'is_current_user': user.id == self.user.id,
                'is_online': bool(presence and presence.is_online),
                'last_seen': presence.last_seen.isoformat() if presence and presence.last_seen else None,
                'connections_count': presence.connections_count if presence else 0,
            })

        return data