from django.urls import path

from .views import (
    PhotoAlbumListCreateView,
    PhotoAlbumDetailView,
    AlbumPhotoListUploadView,
    PhotoDetailView,
)

urlpatterns = [
    path(
        'albums/',
        PhotoAlbumListCreateView.as_view(),
        name='photo_albums'
    ),

    path(
        'albums/<int:album_id>/',
        PhotoAlbumDetailView.as_view(),
        name='photo_album_detail'
    ),

    path(
        'albums/<int:album_id>/photos/',
        AlbumPhotoListUploadView.as_view(),
        name='album_photos'
    ),

    path(
        'photo/<int:photo_id>/',
        PhotoDetailView.as_view(),
        name='photo_detail'
    ),
]