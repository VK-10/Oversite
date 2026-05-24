from qdrant_client import QdrantClient
from nlp_app.ner import generate_embedding
import environ


env = environ.Env(

)
environ.Env.read_env()

client = QdrantClient(
    url = env("QDRANT_ENDPOINT"),
    api_key=env("QDRANT_KEY"),
    # cloud_inference=True
)

def semantic_search(query):

    query_embedding = generate_embedding(
        query
    )

    results = client.query_points(
        collection_name="news_embeddings",
        query=query_embedding,
        limit=5
    )

    return results.payload.title