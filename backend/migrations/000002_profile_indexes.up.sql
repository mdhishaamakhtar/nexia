CREATE INDEX IF NOT EXISTS idx_profiles_user_relationship ON profiles (user_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_profiles_user_full_name_lower ON profiles (user_id, LOWER(full_name));
