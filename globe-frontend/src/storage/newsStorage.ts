import type { NewsArticle } from "../types/rss";
import { openDB } from "idb";

const dbPromise = openDB("newsDB", 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains("articles")) {
            db.createObjectStore("articles", {keyPath: "id"})
                .createIndex("country", "country");
        }
    },
});

export async function saveArticles(articles: NewsArticle[]) {
    const db = await dbPromise;
    const tx = db.transaction("articles", "readwrite");

    for (const article of articles) {
        tx.store.put(article);
    }

    await tx.done;

}

export async function getArticlesByCountry(country : string) {
    const db = await dbPromise;
    const all = await db.getAllFromIndex("articles", "country", country);

    //filter
    // return all.filter(a => a.feed.includes(country));
    return all.filter(a => a.country === country.toLowerCase());
}