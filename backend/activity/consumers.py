import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


class ActivityConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        family_id = await self.get_family_id()

        if not family_id:
            await self.close()
            return

        self.group_name = f'family_activity_{family_id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def activity_event(self, event):
        await self.send(text_data=json.dumps({
            'type': 'activity_update',
            'action': event.get('action'),
            'item_type': event.get('item_type'),
            'item': event.get('item'),
            'item_id': event.get('item_id'),
        }))

    @database_sync_to_async
    def get_family_id(self):
        family = get_user_family(self.user)

        if not family:
            return None

        return family.id