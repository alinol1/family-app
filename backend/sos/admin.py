from django.contrib import admin
from .models import SOSSignal


@admin.register(SOSSignal)
class SOSSignalAdmin(admin.ModelAdmin):

    list_display = [
        'sender',
        'family',
        'status',
        'address',
        'created_at',
        'cancelled_at'
    ]

    list_filter = ['status', 'family']

    search_fields = [
        'sender__first_name',
        'address'
    ]

    filter_horizontal = ['confirmed_by']