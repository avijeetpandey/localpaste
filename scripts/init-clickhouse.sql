-- ClickHouse initialization for localpaste analytics

CREATE TABLE IF NOT EXISTS paste_events
(
    paste_id    String,
    event_type  String,
    user_id     String,
    ip          String,
    referer     String,
    ts          String
)
ENGINE = MergeTree()
ORDER BY (paste_id, ts)
SETTINGS index_granularity = 8192;
