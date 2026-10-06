CREATE TABLE IF NOT EXISTS staff_chat_messages (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 channel TEXT NOT NULL CHECK(channel IN ('all','sales','support','fulfilment','catalogue','analyst')),
 author TEXT NOT NULL,
 role TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS staff_chat_channel_seq ON staff_chat_messages(channel,seq);
CREATE INDEX IF NOT EXISTS staff_chat_author_time ON staff_chat_messages(author,created_at);
CREATE TABLE IF NOT EXISTS staff_chat_reads (email TEXT NOT NULL,channel TEXT NOT NULL,last_seq INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(email,channel));
