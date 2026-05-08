import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class SOSConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        family_id = await self.get_user_family_id()

        if not family_id:
            await self.close()
            return

        self.family_id = family_id
        self.group_name = f'family_sos_{self.family_id}'

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

    async def sos_alert(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_alert',
            'signal': event['signal'],
        }))

    async def sos_confirmed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_confirmed',
            'signal': event['signal'],
            'confirmed_by': event.get('confirmed_by'),
        }))

    async def sos_cancelled(self, event):
        await self.send(text_data=json.dumps({
            'type': 'sos_cancelled',
            'signal': event['signal'],
            'cancelled_by': event.get('cancelled_by'),
        }))

    @database_sync_to_async
    def get_user_family_id(self):
        if not hasattr(self.user, 'family_membership'):
            return None

        return self.user.family_membership.family.id