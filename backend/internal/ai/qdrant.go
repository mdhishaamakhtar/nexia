package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"nexia-backend/internal/models"

	"github.com/qdrant/go-client/qdrant"
)

const CollectionName = "profiles"
const VectorSize = 768 // embedding-001 size

type QdrantClient struct {
	client *qdrant.Client
}

func NewQdrantClient(host string, port int) (*QdrantClient, error) {
	client, err := qdrant.NewClient(&qdrant.Config{
		Host: host,
		Port: port,
	})
	if err != nil {
		return nil, err
	}
	return &QdrantClient{client: client}, nil
}

func (c *QdrantClient) EnsureCollection(ctx context.Context) error {
	collections, err := c.client.ListCollections(ctx)
	if err != nil {
		return err
	}

	for _, col := range collections {
		if col == CollectionName {
			return nil
		}
	}

	// Create collection
	err = c.client.CreateCollection(ctx, &qdrant.CreateCollection{
		CollectionName: CollectionName,
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     VectorSize,
			Distance: qdrant.Distance_Cosine,
		}),
	})
	return err
}

func (c *QdrantClient) UpsertProfile(ctx context.Context, profile *models.Profile, embedding []float32) error {
	payloadBytes, _ := json.Marshal(profile)
	var payloadMap map[string]interface{}
	json.Unmarshal(payloadBytes, &payloadMap)

	// Clean payload for Qdrant (remove complex nested if needed, or keep)
	// For simplicity, we just store full profile as payload

	// Convert ID (uint) to PointID (uint64 or uuid)
	// We'll use uint64
	id := uint64(profile.ID)

	// Create vectors struct
	vectors := &qdrant.Vectors{
		VectorsOptions: &qdrant.Vectors_Vector{
			Vector: &qdrant.Vector{
				Data: embedding,
			},
		},
	}

	log.Printf("Upserting to Qdrant: ID=%d, Collection=%s", id, CollectionName)
	opInfo, err := c.client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: CollectionName,
		Points: []*qdrant.PointStruct{
			{
				Id:      qdrant.NewIDNum(id),
				Vectors: vectors,
				Payload: qdrant.NewValueMap(payloadMap),
			},
		},
	})
	if err != nil {
		log.Printf("Qdrant Upsert Error (ID=%d): %v", id, err)
		return err
	}

	if opInfo.Status != qdrant.UpdateStatus_Completed && opInfo.Status != qdrant.UpdateStatus_Acknowledged {
		return fmt.Errorf("upsert status: %v", opInfo.Status)
	}

	return nil
}

func (c *QdrantClient) SearchContext(ctx context.Context, queryEmbedding []float32, limit uint64) ([]*qdrant.ScoredPoint, error) {
	// 5. Use Variadic NewQuery if supported, otherwise manual
	// Assuming variadic support based on previous error context

	results, err := c.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: CollectionName,
		Query:          qdrant.NewQuery(queryEmbedding...),
		Limit:          &limit,
		WithPayload:    qdrant.NewWithPayload(true),
	})
	if err != nil {
		return nil, err
	}
	return results, nil
}
