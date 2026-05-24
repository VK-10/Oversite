from langchain.tools import tool 
import requests

from tinyfish import TinyFish

from rich import print
from bs4 import BeautifulSoup
from readability import Document
import trafilatura
import re 


tinyfish = TinyFish()

@tool
def web_search(query : str) -> str:
    """Search the web for recent and reliable information on a topic . Returns Titles , URLs and snippets."""
    results = tinyfish.search.query(query=query)

    out = []

    for r in results.results:

        out.append({
            "title": r.title,
            "url": r.url,
            "snippet": r.snippet[:300]
        })

    return out

@tool
def scrape_url(url: str) -> str:
    """
    Scrape and extract clean readable content from a URL.
    Uses multiple extraction strategies for better reliability.
    """
    result = tinyfish.fetch.get_contents(urls=[url])

    print(result.results[0].title)
    print(result.results[0].text)

    return result


