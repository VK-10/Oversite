import spacy

SPACY_LABEL_MAP = {
    "PERSON": "person",
    "ORG": "company",
    "GPE": "country",
}

nlp = spacy.load('en_core_web_sm')

def extract_entities(text):
    # entities NER
    entities = []
    
    doc = nlp(text) #spacy doc obj

    for ent in doc.ents:
        if ent.label_ in SPACY_LABEL_MAP:
            entities.append({"text": ent.text,"start" :ent.start_char, "end": ent.end_char, "type": SPACY_LABEL_MAP[ent.label_]})
    
    return entities

# generating contextual word embedding for the articles (semantic search in future)
def generate_embedding(text):
    print("Generating embedding for text:", text)
    doc = nlp(text)
    embedding = doc.vector
    return embedding.tolist()  # Convert to list for JSON serialization
    