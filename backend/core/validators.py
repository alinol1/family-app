import os
from django.core.exceptions import ValidationError


MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 МБ


ALLOWED_DOCUMENT_EXTENSIONS = {
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'rtf',
    'csv',
    'odt',
    'ods',
    'odp',
}

ALLOWED_IMAGE_EXTENSIONS = {
    'jpg',
    'jpeg',
    'png',
    'webp',
    'heic',
    'heif',
    'bmp',
    'tiff',
    'tif',
}


ALLOWED_DOCUMENT_MIME_TYPES = {
    'application/pdf',

    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    'text/plain',
    'text/csv',
    'application/rtf',
    'text/rtf',

    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
}

ALLOWED_IMAGE_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/bmp',
    'image/tiff',
}


DANGEROUS_EXTENSIONS = {
    'exe',
    'bat',
    'cmd',
    'sh',
    'js',
    'html',
    'htm',
    'php',
    'py',
    'jar',
    'apk',
    'msi',
    'scr',
    'ps1',
    'vbs',
}


def get_extension(file_name):
    return os.path.splitext(file_name)[1].lower().replace('.', '')


def validate_file_size(file):
    if file.size > MAX_FILE_SIZE:
        raise ValidationError('Размер файла не должен превышать 50 МБ.')


def validate_document_file(file):
    extension = get_extension(file.name)
    content_type = getattr(file, 'content_type', '')

    validate_file_size(file)

    if extension in DANGEROUS_EXTENSIONS:
        raise ValidationError('Загрузка файлов данного типа запрещена.')

    if extension not in ALLOWED_DOCUMENT_EXTENSIONS and extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError('Недопустимый формат файла.')

    if content_type:
        if (
            content_type not in ALLOWED_DOCUMENT_MIME_TYPES
            and content_type not in ALLOWED_IMAGE_MIME_TYPES
        ):
            raise ValidationError('Недопустимый MIME-тип файла.')


def validate_image_file(file):
    extension = get_extension(file.name)
    content_type = getattr(file, 'content_type', '')

    validate_file_size(file)

    if extension in DANGEROUS_EXTENSIONS:
        raise ValidationError('Загрузка файлов данного типа запрещена.')

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError('Недопустимый формат изображения.')

    if content_type and content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValidationError('Недопустимый MIME-тип изображения.')