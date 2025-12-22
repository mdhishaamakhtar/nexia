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

	found := false
	for _, col := range collections {
		if col == CollectionName {
			found = true
			break
		}
	}

	if !found {
		// Create collection
		err = c.client.CreateCollection(ctx, &qdrant.CreateCollection{
			CollectionName: CollectionName,
			VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
				Size:     VectorSize,
				Distance: qdrant.Distance_Cosine,
			}),
		})
		if err != nil {
			return err
		}
	}

	// Ensure payload index for user_id
	fieldType := qdrant.FieldType_FieldTypeInteger
	_, err = c.client.CreateFieldIndex(ctx, &qdrant.CreateFieldIndexCollection{
		CollectionName: CollectionName,
		FieldName:      "user_id",
		FieldType:      &fieldType,
	})
	return err
}

func (c *QdrantClient) UpsertProfile(ctx context.Context, profile *models.Profile, embedding []float32) error {
	payloadBytes, _ := json.Marshal(profile)
	var payloadMap map[string]interface{}
	json.Unmarshal(payloadBytes, &payloadMap)

	// Explicitly set user_id to ensure it's stored as an integer in Qdrant
	payloadMap["user_id"] = int64(profile.UserID)

	// Convert ID (uint) to PointID (uint64 or uuid)
	id := uint64(profile.ID)

	// Create vectors struct
	vectors := &qdrant.Vectors{
		VectorsOptions: &qdrant.Vectors_Vector{
			Vector: &qdrant.Vector{
				Data: embedding,
			},
		},
	}

	log.Printf("Upserting to Qdrant: ID=%d, UserID=%d, Collection=%s", id, profile.UserID, CollectionName)
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

func (c *QdrantClient) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit uint64) ([]*qdrant.ScoredPoint, error) {
	results, err := c.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: CollectionName,
		Query:          qdrant.NewQuery(queryEmbedding...),
		Filter: &qdrant.Filter{
			Must: []*qdrant.Condition{
				qdrant.NewMatchInt("user_id", int64(userID)),
			},
		},
		Limit:       &limit,
		WithPayload: qdrant.NewWithPayload(true),
	})
	if err != nil {
		return nil, err
	}
	return results, nil
}
