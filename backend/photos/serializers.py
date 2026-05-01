from rest_framework import serializers
from .models import Photo


class PhotoSerializer(serializers.ModelSerializer):
    """
    Сериализатор фотографии.
    """

    # Имя загрузившего
    uploaded_by_name = serializers.SerializerMethodField()

    # Месяц и год для группировки
    month_year = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id',
            'image',
            'caption',
            'uploaded_by',
            'uploaded_by_name',
            'family',
            'month_year',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'uploaded_by',
            'family',
            'created_at',
        ]

    def get_uploaded_by_name(self, obj):
        return f'{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}'

    def get_month_year(self, obj):
        """
        Возвращает месяц и год для группировки фото.
        Например: "Март 2026"
        """
        months = {
            1: 'Январь', 2: 'Февраль', 3: 'Март',
            4: 'Апрель', 5: 'Май', 6: 'Июнь',
            7: 'Июль', 8: 'Август', 9: 'Сентябрь',
            10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
        }
        month = months[obj.created_at.month]
        year = obj.created_at.year
        return f'{month} {year}'