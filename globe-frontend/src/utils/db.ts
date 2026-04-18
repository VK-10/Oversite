function openDB() : Promise<IDBDatabase> {
    return new Promise((resolve, reject) =? {
        const request = indexedDB.open("newsDB", 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore("countries", {keyPath: "name"});
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(request.error);
    });
}


export const db = await openDB()