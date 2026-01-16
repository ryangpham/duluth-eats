package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("Starting DuluthEats API...")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("API is running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
