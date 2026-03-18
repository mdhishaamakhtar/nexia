package models

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

type Date time.Time

const dateFormat = "2006-01-02"

// UnmarshalJSON parses the JSON string in "YYYY-MM-DD" format
func (d *Date) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), "\"")
	if s == "" || s == "null" {
		return nil
	}
	t, err := time.Parse(dateFormat, s)
	if err != nil {
		return err
	}
	*d = Date(t)
	return nil
}

// MarshalJSON formats the date as "YYYY-MM-DD"
func (d Date) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf("\"%s\"", time.Time(d).Format(dateFormat))), nil
}

// Value implements the driver.Valuer interface for GORM
func (d Date) Value() (driver.Value, error) {
	return time.Time(d), nil
}

// Scan implements the sql.Scanner interface for GORM
func (d *Date) Scan(value any) error {
	if value == nil {
		return nil
	}
	if v, ok := value.(time.Time); ok {
		*d = Date(v)
		return nil
	}
	return fmt.Errorf("failed to scan Date value: %v", value)
}
