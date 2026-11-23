CREATE TABLE IF NOT EXISTS study_sessions (
  participant_id VARCHAR(4) NOT NULL,
  condition_order ENUM('app_first','browser_first') NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  gender ENUM('female','male') NULL,
  education_level ENUM('undergraduate','graduate','other') NOT NULL,
  smartphone_use ENUM('lt_1','1_3','3_5','5_7','gt_7') NOT NULL,
  social_media_use ENUM('lt_1','1_2','2_4','4_6','gt_6') NOT NULL,
  fact_check_frequency TINYINT UNSIGNED NOT NULL,
  source_check_frequency TINYINT UNSIGNED NOT NULL,
  multi_source_frequency TINYINT UNSIGNED NOT NULL,
  used_fact_check_tool BOOLEAN NOT NULL,
  fact_check_tool_name VARCHAR(200) NULL,
  used_facttrace_before BOOLEAN NOT NULL,
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  notes VARCHAR(500) NULL,
  PRIMARY KEY (participant_id),
  CONSTRAINT chk_sessions_participant
    CHECK (participant_id REGEXP '^P[0-9]{1,3}$'),
  CONSTRAINT chk_sessions_age
    CHECK (age BETWEEN 18 AND 100),
  CONSTRAINT chk_sessions_fact_check_frequency
    CHECK (fact_check_frequency BETWEEN 1 AND 7),
  CONSTRAINT chk_sessions_source_check_frequency
    CHECK (source_check_frequency BETWEEN 1 AND 7),
  CONSTRAINT chk_sessions_multi_source_frequency
    CHECK (multi_source_frequency BETWEEN 1 AND 7)
);

CREATE TABLE IF NOT EXISTS decisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  participant_id VARCHAR(4) NOT NULL,
  study_condition ENUM('app','browser') NOT NULL,
  trial_index SMALLINT UNSIGNED NULL,
  is_practice BOOLEAN NOT NULL DEFAULT FALSE,
  claim_familiarity BOOLEAN NULL,
  app_version VARCHAR(20) NULL,
  claim_id VARCHAR(64) NULL,
  claim_text TEXT NOT NULL,
  decision ENUM('trust','dont_trust','unsure') NOT NULL,
  sharing_intention ENUM('1','2','3','4','5','6','7') NOT NULL,
  sources_opened_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  duration_ms INT UNSIGNED NOT NULL,
  correct_answer ENUM('true','false','misleading') NULL,
  was_correct BOOLEAN NULL,
  received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_decisions_participant (participant_id),
  INDEX idx_decisions_condition (study_condition),
  INDEX idx_decisions_claim (claim_id)
);
