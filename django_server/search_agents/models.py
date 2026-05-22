from django.db import models
import uuid

# Create your models here.

class QueryModel(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending"
        PROCESSING = "processing"
        READY = "ready"
        FAILED = "failed"

    id = models.UUIDField(primary_key=True, default = uuid.uuid4)
    feed_id = models.UUIDField(default = uuid.uuid4,editable=False)

    context = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    query = models.TextField()

    response = models.TextField(
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=20,
        choices = Status.choices,
        default = Status.PENDING
    )

    class Meta:
        db_table = "helper"
        app_label = "search_agents"

