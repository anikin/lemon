from django.contrib.contenttypes.models import ContentType
from django.db.models import ForeignKey, ManyToManyField
from django.db.models.base import ModelBase
from django.db.models.signals import post_save, pre_delete, m2m_changed

from lemon import extradmin
from lemon.sitemaps.admin import ItemInline
from lemon.sitemaps.models import Item
from lemon.sitemaps.options import ModelSitemap


class AlreadyRegistered(Exception):

    pass


class NotRegistered(Exception):

    pass


class SitemapSite(object):

    inline_admin_class = ItemInline

    def __init__(self):
        self._registry = {}

    def _append_inline_instance(self, model):
        model_admin = extradmin.site._registry.get(model)
        if not model_admin:
            return
        sitemaps_inline_instance = self.inline_admin_class(model, extradmin.site)
        original_get_inline_instances = model_admin.get_inline_instances
        def get_inline_instances(request):
            inline_instances = original_get_inline_instances(request)
            return inline_instances + [sitemaps_inline_instance]
        model_admin.get_inline_instances = get_inline_instances

    def register(self, model_or_iterable, model_sitemap_class=None, **options):
        if not model_sitemap_class:
            model_sitemap_class = ModelSitemap

        if isinstance(model_or_iterable, ModelBase):
            model_or_iterable = [model_or_iterable]
        for model in model_or_iterable:
            if model in self._registry:
                raise AlreadyRegistered(
                    u'The model %s already registered' % model.__name__)

            self._append_inline_instance(model)

            if options:
                options['__module__'] = __name__
                model_sitemap_class = type(
                    '%sSitemap' % model.__name__,
                    (model_sitemap_class,), options)
            model_sitemap = model_sitemap_class()
            self._registry[model] = model_sitemap

            pre_delete.connect(self.delete_sitemap_item, sender=model)
            post_save.connect(self.check_sitemap_item_url_path, sender=model)
            post_save.connect(self.check_sitemap_item_language, sender=model)

            sites_field_class = model_sitemap.sites_field_class(model)
            if sites_field_class is ManyToManyField:
                through_model = getattr(
                    model, model_sitemap.sites_field_name).through
                m2m_changed.connect(
                    self.check_sitemap_item_sites, sender=through_model)
            else:
                post_save.connect(self.check_sitemap_item_site, sender=model)

    def delete_sitemap_item(self, sender, **kwargs):
        Item.objects.filter_by_content_object(kwargs['instance']).delete()

    def check_sitemap_item_url_path(self, sender, **kwargs):
        instance = kwargs['instance']
        model_sitemap = self._registry.get(sender)
        if model_sitemap:
            try:
                item = Item.objects.get_for_content_object(instance)
            except Item.DoesNotExist:
                pass
            else:
                item.update_url_path()

    def check_sitemap_item_language(self, sender, **kwargs):
        instance = kwargs['instance']
        model_sitemap = self._registry.get(sender)
        if model_sitemap:
            try:
                item = Item.objects.get_for_content_object(instance)
            except Item.DoesNotExist:
                pass
            else:
                item.update_language()

    def check_sitemap_item_site(self, sender, **kwargs):
        instance = kwargs['instance']
        model_sitemap = self._registry.get(sender)
        if model_sitemap:
            try:
                item = Item.objects.get_for_content_object(instance)
            except Item.DoesNotExist:
                pass
            else:
                item.update_sites()

    def check_sitemap_item_sites(self, sender, **kwargs):
        instance = kwargs['instance']
        action = kwargs['action']
        model_sitemap = self._registry.get(instance.__class__)
        if model_sitemap and action in ('post_add', 'post_remove', 'post_clear'):
            try:
                item = Item.objects.get_for_content_object(instance)
            except Item.DoesNotExist:
                pass
            else:
                item.update_sites()

site = SitemapSite()
