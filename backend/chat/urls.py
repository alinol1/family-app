from django.urls import path

from .views import (
    ChatListView,
    CreatePersonalChatView,
    CreateGroupChatView,
    ChatDetailView,
    ChatSettingsView,
    AddChatMembersView,
    RemoveChatMemberView,
    MessageListView,
    SendMessageView,
    ChatPhotoView,
)

urlpatterns = [
    path('', ChatListView.as_view(), name='chat_list'),

    path('create/', CreatePersonalChatView.as_view(), name='create_personal_chat'),
    path('group/', CreateGroupChatView.as_view(), name='create_group_chat'),

    path('<int:chat_id>/', ChatDetailView.as_view(), name='chat_detail'),
    path('<int:chat_id>/settings/', ChatSettingsView.as_view(), name='chat_settings'),

    path('<int:chat_id>/members/', AddChatMembersView.as_view(), name='add_chat_members'),
    path('<int:chat_id>/members/<int:user_id>/', RemoveChatMemberView.as_view(), name='remove_chat_member'),

    path('<int:chat_id>/messages/', MessageListView.as_view(), name='messages'),
    path('<int:chat_id>/send/', SendMessageView.as_view(), name='send_message'),

    path('<int:chat_id>/photo/', ChatPhotoView.as_view(), name='chat_photo'),
]