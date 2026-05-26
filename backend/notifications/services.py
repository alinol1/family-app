from .models import FamilyNotification


def create_family_notification(
    family,
    notification_type,
    title,
    message='',
    created_by=None,
):
    return FamilyNotification.objects.create(
        family=family,
        notification_type=notification_type,
        title=title,
        message=message,
        created_by=created_by,
    )