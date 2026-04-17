import string
import string
from bs4 import BeautifulSoup
from api.data import countries as countries_list
from rapidfuzz import fuzz, process



def clean_post(post):
    description = ""
    if post.get("description"):
        soup = BeautifulSoup(post["description"], "html.parser")
        description = soup.get_text().strip()

    return {
        "id": post["id"],
        "title": post["title"],
        "description": description,
        "published_at": post["published_at"],  # leave as is for now
        "url": post["url"],
        "feed": post["feed"],
    }

def countries_map(country):
    
    result = process.extractOne(country, countries_list)
    print(result)
    return result[0]

