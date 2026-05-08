import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from .models import Chat, Message
from .serializers import MessageSerializer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        self.chat_id = self.scope['url_route']['kwargs']['chat_id']
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
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data.get('text', '').strip()

        if not message_text:
            return

        message_data = await self.create_message(message_text)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_data,
            }
        )

        chat_updates = await self.get_chat_updates_for_members()

        for update in chat_updates:
            await self.channel_layer.group_send(
                f'user_chats_{update["user_id"]}',
                {
                    'type': 'chat_list_update',
                    'chat': update['chat'],
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
        }))

    @database_sync_to_async
    def user_has_access_to_chat(self):
        return Chat.objects.filter(
            id=self.chat_id,
            members=self.user
        ).exists()

    @database_sync_to_async
    def create_message(self, text):
        chat = Chat.objects.get(id=self.chat_id)

        message = Message.objects.create(
            chat=chat,
            sender=self.user,
            text=text
        )

        serializer = MessageSerializer(message)
        return serializer.data

    @database_sync_to_async
    def get_chat_updates_for_members(self):
        chat = Chat.objects.get(id=self.chat_id)
        last_message = chat.messages.last()

        updates = []

        for user in chat.members.all():
            unread_count = chat.messages.filter(
                is_read=False
            ).exclude(
                sender=user
            ).count()

            if chat.chat_type == 'family':
                chat_name = chat.family.name
            else:
                other_user = chat.members.exclude(id=user.id).first()
                chat_name = (
                    f'{other_user.first_name} {other_user.last_name}'.strip()
                    if other_user
                    else 'Личный чат'
                )

            updates.append({
                'user_id': user.id,
                'chat': {
                    'id': chat.id,
                    'chat_type': chat.chat_type,
                    'family': chat.family.id if chat.family else None,
                    'chat_name': chat_name,
                    'members_count': chat.members.count(),
                    'unread_count': unread_count,
                    'last_message': {
                        'text': last_message.text,
                        'sender': last_message.sender.first_name,
                        'created_at': last_message.created_at.isoformat(),
                    } if last_message else None,
                    'created_at': chat.created_at.isoformat(),
                }
            })

        return updates


class ChatListConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        self.group_name = f'user_chats_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def chat_list_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_update',
            'chat': event['chat'],
        }))