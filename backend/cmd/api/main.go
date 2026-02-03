package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/joho/godotenv"
	"github.com/ryangpham/duluth-eats/internal/cache"
	"github.com/ryangpham/duluth-eats/internal/db"
	"github.com/ryangpham/duluth-eats/internal/handlers"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	cache.InitRedis()

	fmt.Println("Starting DuluthEats API...")

	http.HandleFunc("/restaurants", handlers.GetRestaurants)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("API is running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
