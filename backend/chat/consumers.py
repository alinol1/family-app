import json
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Chat, Message
from .serializers import MessageSerializer, ChatSerializer


def get_user_family(user):
    if not hasattr(user, 'family_membership'):
        return None

    return user.family_membership.family


def make_json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, UUID):
        return str(value)

    if isinstance(value, dict):
        return {
            str(key): make_json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            make_json_safe(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return [
            make_json_safe(item)
            for item in value
        ]

    return value


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        try:
            self.chat_id = int(self.scope['url_route']['kwargs']['chat_id'])
        except (TypeError, ValueError):
            await self.close()
            return

        self.room_group_name = f'chat_{self.chat_id}'

        if self.user.is_anonymous:
            await self.close()
            return

        has_access = await self.user_has_access_to_chat()

        if not has_access:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        message_text = str(data.get('text', '')).strip()

        if not message_text:
            return

        message_data = await self.create_message(message_text)

        if not message_data:
            await self.close()
            return

        safe_message_data = make_json_safe(message_data)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': safe_message_data,
            }
        )

        chat_updates = await self.get_chat_updates_for_members()

        for update in chat_updates:
            await self.channel_layer.group_send(
                f'user_chats_{update["user_id"]}',
                {
                    'type': 'chat_list_update',
                    'chat': make_json_safe(update['chat']),
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': make_json_safe(event['message']),
        }))

    @database_sync_to_async
    def user_has_access_to_chat(self):
        family = get_user_family(self.user)

        if not family:
            return False

        return Chat.objects.filter(
            id=self.chat_id,
            family=family,
            members=self.user
        ).exists()

    @database_sync_to_async
    def create_message(self, text):
        family = get_user_family(self.user)

        if not family:
            return None

        try:
            chat = Chat.objects.get(
                id=self.chat_id,
                family=family,
                members=self.user
            )
        except Chat.DoesNotExist:
            return None

        message = Message.objects.create(
            chat=chat,
            sender=self.user,
            text=text
        )

        chat.save(update_fields=['updated_at'])

        serializer = MessageSerializer(message)

        return make_json_safe(serializer.data)

    @database_sync_to_async
    def get_chat_updates_for_members(self):
        family = get_user_family(self.user)

        if not family:
            return []

        try:
            chat = Chat.objects.prefetch_related(
                'members'
            ).get(
                id=self.chat_id,
                family=family,
                members=self.user
            )
        except Chat.DoesNotExist:
            return []

        updates = []

        for user in chat.members.all():
            request = type(
                'Request',
                (),
                {
                    'user': user
                }
            )()

            serializer = ChatSerializer(
                chat,
                context={
                    'request': request
                }
            )

            updates.append({
                'user_id': user.id,
                'chat': make_json_safe(serializer.data),
            })

        return make_json_safe(updates)


class ChatListConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        has_family = await self.user_has_family()

        if not has_family:
            await self.close()
            return

        self.group_name = f'user_chats_{self.user.id}'

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

    async def chat_list_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_update',
            'chat': make_json_safe(event['chat']),
        }))

    @database_sync_to_async
    def user_has_family(self):
        return hasattr(self.user, 'family_membership')