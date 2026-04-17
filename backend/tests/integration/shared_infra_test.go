package integration_test

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	goredis "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
	gormPostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	sharedInfraCtx context.Context

	sharedInfraMu sync.Mutex
	sharedDBSeq   atomic.Uint64

	sharedPostgresContainer *tcpostgres.PostgresContainer
	sharedRedisContainer    *tcredis.RedisContainer
	sharedPostgresConnStr   string
	sharedRedisURL          string
	sharedAdminDB           *gorm.DB
	sharedRedisClient       *goredis.Client
)

func TestMain(m *testing.M) {
	sharedInfraCtx = context.Background()

	if err := startSharedInfra(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to start shared integration infra: %v\n", err)
		os.Exit(1)
	}

	code := m.Run()

	if err := stopSharedInfra(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to stop shared integration infra: %v\n", err)
		if code == 0 {
			code = 1
		}
	}

	os.Exit(code)
}

func startSharedInfra() error {
	var err error

	sharedPostgresContainer, err = tcpostgres.Run(sharedInfraCtx,
		"pgvector/pgvector:pg16",
		tcpostgres.WithDatabase("postgres"),
		tcpostgres.WithUsername("postgres"),
		tcpostgres.WithPassword("secret"),
		tcpostgres.BasicWaitStrategies(),
	)
	if err != nil {
		return fmt.Errorf("run postgres container: %w", err)
	}

	sharedPostgresConnStr, err = sharedPostgresContainer.ConnectionString(sharedInfraCtx, "sslmode=disable")
	if err != nil {
		return fmt.Errorf("postgres connection string: %w", err)
	}

	sharedAdminDB, err = gorm.Open(gormPostgres.Open(sharedPostgresConnStr), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("open admin postgres connection: %w", err)
	}

	sharedRedisContainer, err = tcredis.Run(sharedInfraCtx, "redis:7")
	if err != nil {
		return fmt.Errorf("run redis container: %w", err)
	}

	sharedRedisURL, err = sharedRedisContainer.ConnectionString(sharedInfraCtx)
	if err != nil {
		return fmt.Errorf("redis connection string: %w", err)
	}

	redisOpts, err := goredis.ParseURL(sharedRedisURL)
	if err != nil {
		return fmt.Errorf("parse redis url: %w", err)
	}

	sharedRedisClient = goredis.NewClient(redisOpts)

	ctx, cancel := context.WithTimeout(sharedInfraCtx, 5*time.Second)
	defer cancel()
	if err := sharedRedisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping redis: %w", err)
	}

	return nil
}

func stopSharedInfra() error {
	var firstErr error

	if err := sharedRedisClient.Close(); err != nil && firstErr == nil {
		firstErr = fmt.Errorf("close redis client: %w", err)
	}

	if sharedAdminDB != nil {
		sqlDB, err := sharedAdminDB.DB()
		if err != nil && firstErr == nil {
			firstErr = fmt.Errorf("get admin sql db: %w", err)
		} else if err == nil {
			if closeErr := sqlDB.Close(); closeErr != nil && firstErr == nil {
				firstErr = fmt.Errorf("close admin sql db: %w", closeErr)
			}
		}
	}

	if sharedRedisContainer != nil {
		if err := sharedRedisContainer.Terminate(sharedInfraCtx); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("terminate redis container: %w", err)
		}
	}

	if sharedPostgresContainer != nil {
		if err := sharedPostgresContainer.Terminate(sharedInfraCtx); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("terminate postgres container: %w", err)
		}
	}

	return firstErr
}

func lockSharedInfra(t *testing.T, useRedis bool) {
	t.Helper()

	sharedInfraMu.Lock()

	if useRedis {
		require.NoError(t, flushSharedRedis())
	}

	t.Cleanup(func() {
		if useRedis {
			if err := flushSharedRedis(); err != nil {
				t.Errorf("flush redis after test: %v", err)
			}
		}
		sharedInfraMu.Unlock()
	})
}

func createIsolatedTestDatabase(t *testing.T, runMigrations bool) (*gorm.DB, string) {
	t.Helper()

	dbName := fmt.Sprintf("nexia_test_%06d", sharedDBSeq.Add(1))
	require.NoError(t, sharedAdminDB.Exec(`CREATE DATABASE "`+dbName+`"`).Error)

	connStr := connectionStringForDB(t, dbName)
	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	if err != nil {
		_ = dropIsolatedTestDatabase(dbName)
		require.NoError(t, err)
	}

	require.NoError(t, db.Exec("CREATE EXTENSION IF NOT EXISTS vector;").Error)

	if runMigrations {
		runTestMigrations(t, connStr)
	}

	sqlDB, err := db.DB()
	require.NoError(t, err)

	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close test database %s: %v", dbName, err)
		}
		if err := dropIsolatedTestDatabase(dbName); err != nil {
			t.Errorf("drop test database %s: %v", dbName, err)
		}
	})

	return db, connStr
}

func connectionStringForDB(t *testing.T, dbName string) string {
	t.Helper()

	u, err := url.Parse(sharedPostgresConnStr)
	require.NoError(t, err)
	u.Path = "/" + dbName
	return u.String()
}

func runTestMigrations(t *testing.T, connStr string) {
	t.Helper()

	m, err := migrate.New("file://../../migrations", connStr)
	require.NoError(t, err)
	defer func() {
		srcErr, dbErr := m.Close()
		if srcErr != nil {
			t.Errorf("close migration source: %v", srcErr)
		}
		if dbErr != nil {
			t.Errorf("close migration database: %v", dbErr)
		}
	}()

	err = m.Up()
	require.True(t, err == nil || err == migrate.ErrNoChange)
}

func dropIsolatedTestDatabase(dbName string) error {
	if err := sharedAdminDB.Exec(
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ? AND pid <> pg_backend_pid()",
		dbName,
	).Error; err != nil {
		return err
	}

	return sharedAdminDB.Exec(`DROP DATABASE IF EXISTS "` + dbName + `"`).Error
}

func flushSharedRedis() error {
	ctx, cancel := context.WithTimeout(sharedInfraCtx, 5*time.Second)
	defer cancel()
	return sharedRedisClient.FlushDB(ctx).Err()
}
