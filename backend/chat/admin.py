from django.contrib import admin
from .models import Chat, Message


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):

    list_display = [
        'id',
        'chat_type',
        'family',
        'created_at'
    ]

    list_filter = ['chat_type']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):

    list_display = [
        'sender',
        'chat',
        'text',
        'is_read',
        'created_at'
    ]

    list_filter = ['is_read']

    search_fields = ['text', 'sender__first_name']