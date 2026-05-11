from qdrant_client.models import PointStruct
import environ
from api.models import News
from celery import shared_task
from nlp_app.ner import extract_entities
from nlp_app.ner import generate_embedding

from qdrant_client import QdrantClient

env = environ.Env(

)
environ.Env.read_env()

from qdrant_client.models import (
    VectorParams,
    Distance,
)

client = QdrantClient(
    url = env("QDRANT_ENDPOINT"),
    api_key=env("QDRANT_KEY"),
    # cloud_inference=True
)

# if client.health().status != "OK":
#     print("Qdrant client is not healthy. Please check the connection.")


@shared_task
def process_news(feed_id):
    article_instance = News.objects.get(id = feed_id)

    print("Processing news with feed_id:", article_instance.title)

    entities = extract_entities(article_instance.description)

    embedding = generate_embedding(article_instance.description)

    if not client.collection_exists("news_embeddings"):
        client.create_collection(
        collection_name="news_embeddings",
        vectors_config=VectorParams(
            size=96,
            distance=Distance.COSINE
        )
    )


    client.upsert(
        collection_name="news_embeddings",
        
        points=[
            PointStruct(
                id=str(article_instance.id),

                vector=embedding,

                payload={
                    "title": article_instance.title,
                    "url":article_instance.url,
                }
            )
        ]
    )

    print(entities)

    
    article_instance.embedding_id = str(article_instance.id)
    article_instance.processed = True
    article_instance.save()
    