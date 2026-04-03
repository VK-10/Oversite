-- +goose Up
ALTER TABLE feeds ADD COLUMN last_fetched_at TIMESTAMP ;

-- +goose Down
Alter TABLE users DROP COLUMN last_fetched_at;



