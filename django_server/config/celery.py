from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'vsite.settings')

app = Celery('config')

app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'process-news-every-minute': {
        'task': 'nlp_app.tasks.process_news',
        'schedule': 60.0,  # Run every minute
    },
}

app.conf.update(
    broker_url = 'amqp://guest:guest@localhost:5672//',
    task_routes={
        'nlp_app.tasks.process_news': {'queue': 'article-queue'},
    },
)