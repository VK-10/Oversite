/*layer combining the storage(indexed db) and service layer*/
import {fetchCountryNews} from "../services/newsService"
import {saveArticles, getArticlesByCountry } from "../storage/newsStorage"

import type { NewsArticle } from "../types/rss"

export async function getCountryNews(country: string, onUpdate?: (articles: NewsArticle[]) => void): Promise<NewsArticle[]> {
    country = country.toLowerCase()

    const cached = await getArticlesByCountry(country);

    //background fetch
    const fetchPromise = fetchCountryNews(country)
    .then(async (fresh) => {
        if (fresh.length > 0) {
            await saveArticles(fresh);
            onUpdate?.(fresh)
        }
        console.log("fetching from API...")
        return fresh;
    })
    .catch((err) => {
        console.log("fetch failed");
        throw err;
    })
    

    if (cached.length > 0) { //if cached is present
        console.log("fetching from cache...")
        return cached; 
    }

    return await fetchPromise;
}