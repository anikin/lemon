from django.conf import settings
from django.conf.urls import patterns, include, url
from django.conf.urls.static import static
from django.contrib import admin

from lemon import extradmin


admin.autodiscover()
urlpatterns = patterns('',
    url(r'^admin/', include(extradmin.site.urls)),
    url(r'^robots\.txt', include('lemon.robots.urls')),
    url(r'^sitemap\.xml', include('lemon.sitemaps.urls')),
) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
