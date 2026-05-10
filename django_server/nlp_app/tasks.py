from api.models import News
from celery import shared_task
from nlp_app.ner import extract_entities
from nlp_app.ner import generate_embedding

@shared_task
def process_news(feed_id):
    article_instance = News.objects.get(id = feed_id)

    print("Processing news with feed_id:", article_instance.title)

    entities = extract_entities(article_instance.description)

    embedding = generate_embedding(article_instance.description)

    print(entities)

    article_instance.processed = True
    # article_instance.embedding_id = embedding
    article_instance.save()
    