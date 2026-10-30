-- facttrace database schema (mysql 8.0.16 or newer)
-- content tables (what the app shows): claims, sources, claim_sources, evidence, provenance_signals
-- study tables (what the study measures): study_sessions, decisions
-- all times are stored in utc

SET NAMES utf8mb4;

-- one row per claim in the curated dataset
-- claim_id is also what a qr code contains, for example claim_04
CREATE TABLE claims (
  claim_id              VARCHAR(20)   NOT NULL,
  claim_text            TEXT          NOT NULL,
  correct_answer        ENUM('true','false','misleading') NOT NULL,
  answer_rationale      TEXT          NULL,
  overall_stance        ENUM('supports','contradicts','mixed','unclear') NOT NULL,
  summary               TEXT          NOT NULL,
  origin_outlet         VARCHAR(200)  NULL,
  origin_author         VARCHAR(200)  NULL,
  origin_first_seen_at  DATE          NULL,
  origin_url            VARCHAR(2048) NULL,
  study_medium          ENUM('printed','screen','qr') NULL,
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (claim_id),
  CONSTRAINT chk_claims_id CHECK (claim_id REGEXP '^claim_[0-9]{2,3}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- one row per source (article, report, fact check, official page)
-- a source can be used by more than one claim, through claim_sources
CREATE TABLE sources (
  source_id     VARCHAR(20)   NOT NULL,
  title         VARCHAR(500)  NOT NULL,
  outlet        VARCHAR(200)  NOT NULL,
  author        VARCHAR(200)  NULL,
  published_at  DATE          NULL,
  url           VARCHAR(2048) NOT NULL,
  source_type   ENUM('news','fact_check','official','academic','social') NOT NULL,
  accessed_at   DATE          NULL,
  PRIMARY KEY (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- which sources belong to which claim, and which one is the primary source for that claim
CREATE TABLE claim_sources (
  claim_id       VARCHAR(20)       NOT NULL,
  source_id      VARCHAR(20)       NOT NULL,
  is_primary     BOOLEAN           NOT NULL DEFAULT FALSE,
  display_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (claim_id, source_id),
  KEY idx_claim_sources_source (source_id),
  CONSTRAINT fk_claim_sources_claim FOREIGN KEY (claim_id) REFERENCES claims (claim_id) ON DELETE CASCADE,
  CONSTRAINT fk_claim_sources_source FOREIGN KEY (source_id) REFERENCES sources (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- one finding about a claim, taken from one of that claim's sources
-- the foreign key on (claim_id, source_id) means evidence can only use a source linked to the same claim
CREATE TABLE evidence (
  evidence_id    VARCHAR(20)       NOT NULL,
  claim_id       VARCHAR(20)       NOT NULL,
  source_id      VARCHAR(20)       NOT NULL,
  summary        TEXT              NOT NULL,
  evidence_text  TEXT              NULL,
  stance         ENUM('supports','contradicts','context') NOT NULL,
  display_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (evidence_id),
  KEY idx_evidence_claim (claim_id, display_order),
  CONSTRAINT fk_evidence_claim_source FOREIGN KEY (claim_id, source_id) REFERENCES claim_sources (claim_id, source_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- provenance cues shown for a claim, for example "original source found"
-- the "curated dataset" cue is added by the backend to every claim, so it is not stored here
CREATE TABLE provenance_signals (
  signal_id      INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  claim_id       VARCHAR(20)       NOT NULL,
  signal_key     ENUM('original_source','claim_date','independent_sources','source_types') NOT NULL,
  label          VARCHAR(100)      NOT NULL,
  detail         VARCHAR(500)      NOT NULL,
  level          ENUM('positive','neutral','warning') NOT NULL,
  display_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (signal_id),
  UNIQUE KEY uq_signals_claim_key (claim_id, signal_key),
  CONSTRAINT fk_signals_claim FOREIGN KEY (claim_id) REFERENCES claims (claim_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- one row per study participant: their anonymous code and which condition they did first
CREATE TABLE study_sessions (
  participant_id   VARCHAR(4)   NOT NULL,
  condition_order  ENUM('app_first','browser_first') NOT NULL,
  started_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  notes            VARCHAR(500) NULL,
  PRIMARY KEY (participant_id),
  CONSTRAINT chk_sessions_participant CHECK (participant_id REGEXP '^P[0-9]{1,3}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- one row per answer a participant gives (the study results)
-- no foreign key to study_sessions on purpose, so an answer is never lost because a session row is missing
CREATE TABLE decisions (
  decision_id          CHAR(36)      NOT NULL,
  client_record_id     VARCHAR(64)   NULL,
  participant_id       VARCHAR(4)    NOT NULL,
  study_condition      ENUM('app','browser') NOT NULL,
  trial_index          SMALLINT UNSIGNED NULL,
  is_practice          BOOLEAN       NOT NULL DEFAULT FALSE,
  app_version          VARCHAR(20)   NULL,
  claim_id             VARCHAR(20)   NULL,
  claim_text           TEXT          NOT NULL,
  original_ocr_text    TEXT          NULL,
  text_was_edited      BOOLEAN       NULL,
  input_source         ENUM('ocr','qr','manual') NULL,
  match_status         ENUM('MATCH','WEAK_MATCH','NO_MATCH') NULL,
  match_score          DECIMAL(4,3)  NULL,
  weak_reason          ENUM('low_ocr_confidence','low_similarity','both') NULL,
  weak_match_confirmed BOOLEAN       NULL,
  fact_check_found     BOOLEAN       NULL,
  ocr_engine           ENUM('cloud_vision','tesseract') NULL,
  ocr_error            ENUM('NO_TEXT','OCR_FAILED','PARTIAL') NULL,
  ocr_confidence       DECIMAL(4,3)  NULL,
  ocr_retakes          TINYINT UNSIGNED NULL,
  decision             VARCHAR(20)   NOT NULL,
  sharing_intention    VARCHAR(20)   NOT NULL,
  sources_opened       JSON          NOT NULL,
  sources_opened_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  started_at           DATETIME(3)   NOT NULL,
  ended_at             DATETIME(3)   NOT NULL,
  duration_ms          INT UNSIGNED  NOT NULL,
  correct_answer       ENUM('true','false','misleading') NULL,
  was_correct          BOOLEAN       NULL,
  received_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (decision_id),
  UNIQUE KEY uq_decisions_client_record (client_record_id),
  KEY idx_decisions_participant (participant_id),
  KEY idx_decisions_condition_claim (study_condition, claim_id),
  CONSTRAINT fk_decisions_claim FOREIGN KEY (claim_id) REFERENCES claims (claim_id),
  CONSTRAINT chk_decisions_participant CHECK (participant_id REGEXP '^P[0-9]{1,3}$'),
  CONSTRAINT chk_decisions_times CHECK (ended_at >= started_at),
  CONSTRAINT chk_decisions_scores CHECK ((match_score IS NULL OR match_score BETWEEN 0 AND 1) AND (ocr_confidence IS NULL OR ocr_confidence BETWEEN 0 AND 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;