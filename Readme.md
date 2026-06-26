# Oversite 🌍 

**Oversite** is a geospatial news discovery engine that enhances the traditional "scroll" with a 3D interactive experience. By mapping global events onto a WebGL-powered globe, Oversite provides a literal "bird's-eye view" of the world's information.

[Live Demo](https://oversite-beryl.vercel.app/) | [twitter](https://x.com/vishwajeet19_/status/2046196431976092155?s=20) |
[Agentic AI demo](https://x.com/vishwajeet19_/status/2058704584407928883?s=20)

---

## 💡 The Concept
In an era of information fatigue, **Oversite** offers a spatial perspective. Instead of being fed news by an algorithm, users navigate around the planet to discover stories. It is an **over-site** (an overview) of the world’s current **sites** (events).

## 🛠 Tech Stack
* **Engine:** [Three.js / React Three Fiber] — Rendering the high-performance 3D environment.
* **Framework:** [React] — For a responsive, single-page application architecture.
* **Data:** [NewsAPI / GNews / custom] — Real-time ingestion of global headlines.
* **Styling:** Tailwind CSS — Using a "Midnight & Amber" palette for a premium, low-light aesthetic.
* **AI:** [LangGraph / Google Gemini] — Agentic pipeline for deep-dive research and analysis.

## 🚀 Key Technical Features
* **Geospatial Mapping:** Logic to convert latitude/longitude coordinates from news metadata into 3D Cartesian coordinates ($x, y, z$) on a sphere.
* **Interactive Camera:** Custom orbit controls allowing for seamless rotation, zoom, and "point-of-interest" snapping.
* **Data Clustering:** Smart grouping of news pins to prevent UI clutter in high-density regions like Europe or North America.
* **Real-time Beacons:** Animated shaders to represent "breaking" stories with a pulsing visual effect.
* **Agentic AI Research Panel:** Click any news article to launch an AI agent — similar to Oversite's DeepSearch — that scrapes the article, writes a structured research report, and runs a critic pass to score and improve it. Streams results token-by-token in real time.

## 🏗️ Architecture
1.  **Ingestion:** Fetches headlines from multiple global providers.
2.  **Geocoding:** Translates country/city metadata into coordinate vectors.
3.  **Rendering:** Passes data to the 3D layer to instantiate news "nodes" on the globe.
4.  **Interaction:** Raycasting allows users to click 3D objects to trigger 2D UI news modals.
5.  **Agentic Pipeline:** A LangGraph graph with a `search` node (scrapes the article URL), a `write` node (generates a research report via Gemini), and a `critic` node (scores and critiques the report) — all streamed over SSE from a Django backend.

## 📖 How to Run
1.  **Clone:** `git clone git@github.com:VK-10/Oversite.git`
2.  **Install:** `npm install`
3.  **Keys:** Add your `API_KEY` to a `.env` file.
4.  **Launch:** `npm run dev`

## 📈 Future Roadmap
- [ ] **Timeline Slider:** Scrub through the last 24 hours of news to see how stories spread across the map.
- [ ] **Sentiment Heatmap:** Color-coding the globe based on the emotional tone of local headlines.
- [ ] **Language Translation:** Auto-translate local news pins into English via LLM integration.
- [ ] **Trained On Local GeoPolitical Hotspots**  based on the research wotk on https://research.google/blog/protecting-cities-with-ai-driven-flash-flood-forecasting/

---
Developed by Vishwajeet Prasad and Gautam Sharma – *Connecting the dots, globally.*
