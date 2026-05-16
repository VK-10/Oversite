import os
import django
import time

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings"
)

django.setup()

from api.models import News
from nlp_app.tasks import process_news

BATCH_SIZE = 50

queryset = News.objects.filter(
    processed = False
).order_by("created_at") # doesnt load all the data in memory 

count = queryset.count()

articles = queryset.iterator()

print(f"Processing {count} articles...")

for index, article in enumerate(articles):
    try:
        print(
            f"\n[{index+1}] Processing:",
            article.title
        )

        process_news.delay((str(article.id)))
        time.sleep(0.2)

        print("Done")
    except Exception as e:

        print(
            f"FAILED: {article.id}"

        )
        print(e)