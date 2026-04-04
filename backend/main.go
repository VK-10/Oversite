package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/VK-10/oversite/backend/handler"
	"github.com/VK-10/oversite/backend/internal/database"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type apiConfig struct {
}

func main() {

	godotenv.Load(".env")

	port := os.Getenv("PORT")
	if port == "" {
		log.Fatal("PORT is not found in the environment")
	}

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL is not found in the environment")
	}
	fmt.Println("DB_URL:", os.Getenv("DB_URL"))

	conn, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Can;t connect to database:", err)
	}

	// apiCfg := apiConfig{
	// 	DB: database.New(conn),
	// }

	db := database.New(conn)
	apiCfg := handler.ApiConfig{DB: db}

	// go startScraping(db, 10, time.Minute)

	fmt.Println("PORT:", port)

	router := chi.NewRouter()

	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	v1Router := chi.NewRouter()

	v1Router.Get("/health", handler.HandlerReadiness)
	v1Router.Get("/err", handler.HandleErr)
	v1Router.Post("/users", apiCfg.HandleCreateUser)
	v1Router.Get("/users", apiCfg.MiddlewareAuth(apiCfg.HandlerGetUser))

	v1Router.Post("/feeds", apiCfg.MiddlewareAuth(apiCfg.HandlerCreateFeed))
	v1Router.Get("/feeds", apiCfg.HandlerGetsFeed)

	v1Router.Post("/feed_follows", apiCfg.MiddlewareAuth(apiCfg.HandlerCreateFeedFollow))
	v1Router.Get("/feed_follows", apiCfg.MiddlewareAuth(apiCfg.HandlerGetFeedFollow))
	v1Router.Delete("/feed_follows/{feedFollowID}", apiCfg.MiddlewareAuth(apiCfg.HandlerDeleteFeedFollow))

	v1Router.Get("/user_post", apiCfg.MiddlewareAuth(apiCfg.HandlerGetPostsForUser))

	router.Mount("/v1", v1Router)

	srv := &http.Server{
		Handler: router,
		Addr:    ":" + port,
	}

	log.Printf("Server starting on %v", srv.Addr)

	err = srv.ListenAndServe()
	if err != nil {
		log.Fatal(err)
	}

}
