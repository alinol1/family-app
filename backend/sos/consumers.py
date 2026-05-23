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

        if not self.channel_layer:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name') and self.channel_layer:
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def sos_alert(self, event):
        signal = event.get('signal')

        if not signal:
            return

        await self.send(text_data=json.dumps({
            'type': 'sos_alert',
            'signal': signal,
        }))

    async def sos_confirmed(self, event):
        signal = event.get('signal')

        if not signal:
            return

        await self.send(text_data=json.dumps({
            'type': 'sos_confirmed',
            'signal': signal,
            'confirmed_by': event.get('confirmed_by'),
        }))

    async def sos_cancelled(self, event):
        signal = event.get('signal')

        if not signal:
            return

        await self.send(text_data=json.dumps({
            'type': 'sos_cancelled',
            'signal': signal,
            'cancelled_by': event.get('cancelled_by'),
        }))

    @database_sync_to_async
    def get_user_family_id(self):
        if not hasattr(self.user, 'family_membership'):
            return None

        return self.user.family_membership.family_id