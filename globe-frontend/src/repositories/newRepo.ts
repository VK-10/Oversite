/*layer combining the storage(indexed db) and service layer*/
import {fetchCountryNews} from "../services/newsService"
import {saveArticles, getArticlesByCountry } from "../storage/newsStorage"

import type { NewsArticle } from "../types/rss"

export async function getCountryNews(country: string): Promise<NewsArticle[]> {
    country = country.toLowerCase()
    try {
        //fetching 
        const fresh = await fetchCountryNews(country);
        console.log("Fetching from API...");
        //updating indexedDB
        await saveArticles(fresh)

        return fresh;

    } catch (err) {

        const cached = await getArticlesByCountry(country);
        console.log("caching", cached.length)
        if (cached.length > 0) {
            return cached;
        }

        throw err;
    }   
}