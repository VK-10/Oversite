from django.template.defaultfilters import default
from django.db import models
from api.models import News

# Create your models here.
class Entity(models.Model):
    ENTTITY_TYPES=[
        ("person", "Person"),
        ("company", "Company"),
        ("country", "Country"),
        ("Organisation", "Organisation"),
    ] 

    name = models.CharField(max_length=255)

    canonical_name = models.CharField(max_length=255)

    entity_type = models.CharField(
        max_length = 50,
        choices = ENTTITY_TYPES
    )

    country = models.CharField(max_length=100,
        blank=True,
        null=True)

    metadata = models.JSONField(default = dict, blank = True)


class ArticleEntity(models.Model):
    article = models.ForeignKey(
        News,
        on_delete=models.CASCADE,
    )

    entity = models.ForeignKey(
        Entity,
        on_delete=models.CASCADE
    )

    relevance_score = models.FloatField(default=0.0)

    mentions = models.IntegerField(
        default=1
    )