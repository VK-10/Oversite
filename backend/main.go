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

	apiCfg := handler.ApiConfig{DB: database.New(conn)}

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
