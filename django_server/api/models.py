import uuid
from django.db import models

# Create your models here.
class News(models.Model):
    "unique -> feed id gives list of news (description) News model for diffrent level of locality {Post table}"

    id = models.UUIDField(primary_key=True, default= uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default = "Untitled")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField()
    description = models.CharField(max_length = 1000000)
    published_at = models.CharField( null = True, blank=True)
    url = models.CharField()
    feed = models.ForeignKey('Scope', editable=False, on_delete=models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = "posts"

class Scope(models.Model):
    "{from feeds table can return all feed-id from the specific user-id and channel-name}"
    id = models.UUIDField(primary_key=True, default= uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField()
    name=models.CharField(max_length=100)
    url=models.CharField()
    user=models.ForeignKey('Tag', editable=False, on_delete=models.DO_NOTHING)
    last_fetched_at=models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'feeds'

class Tag(models.Model):
    "{user table, give ApiKey and the selecte userid and will return the list of feed_id associated with that user_id}"
    id = models.UUIDField(primary_key=True, default= uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField()
    name=models.CharField(max_length=100)
    api_key = models.CharField(max_length = 1000000)

    class Meta:
        managed = False
        db_table = 'users'
