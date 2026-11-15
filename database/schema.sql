PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    province_name TEXT NOT NULL,
    level TEXT NOT NULL
        CHECK (level IN ('province', 'district')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_records (
    id INTEGER PRIMARY KEY,
    area_id TEXT NOT NULL,
    source TEXT NOT NULL,
    model TEXT NOT NULL,

    valid_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL,

    temperature_c REAL NOT NULL,
    humidity_percent REAL NOT NULL
        CHECK (humidity_percent BETWEEN 0 AND 100),
    wind_speed_kmh REAL NOT NULL
        CHECK (wind_speed_kmh >= 0),

    FOREIGN KEY (area_id) REFERENCES areas(id),

    UNIQUE (area_id, source, model, valid_at)
);