-- Generation Jobs Table for Webhook Pattern
-- Stores async generation job status for long-running Modal operations

CREATE TABLE generation_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  prompt TEXT NOT NULL,
  parameters JSON,
  audio_url VARCHAR(512),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_job_id (job_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
