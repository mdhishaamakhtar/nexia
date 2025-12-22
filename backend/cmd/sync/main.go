package main

import (
	"log"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/queue"
	"nexia-backend/pkg/db"
)

func main() {
	// 1. Load Config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Connect to Database
	if err := db.Connect(cfg); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 3. Connect to Queue
	if cfg.AI.RedisURL == "" {
		log.Fatal("Redis URL not configured. Cannot sync embeddings.")
	}
	queueClient := queue.NewQueueClient(cfg.AI.RedisURL)
	defer queueClient.Close()

	log.Println("Starting Profile Embedding Sync...")

	// 4. Batch Process
	var page = 1
	var limit = 100
	var count int

	for {
		var profiles []models.Profile
		offset := (page - 1) * limit

		result := db.DB.Limit(limit).Offset(offset).Find(&profiles)
		if result.Error != nil {
			log.Fatalf("Failed to fetch profiles: %v", result.Error)
		}

		if len(profiles) == 0 {
			break
		}

		for _, p := range profiles {
			if err := queueClient.EnqueueEmbeddingTask(uint(p.ID)); err != nil {
				log.Printf("Failed to enqueue profile %d: %v", p.ID, err)
			} else {
				count++
			}
		}

		log.Printf("Processed batch %d (%d profiles enqueued so far)", page, count)
		page++
	}

	log.Printf("Sync complete! Enqueued %d profiles for embedding.", count)
}
