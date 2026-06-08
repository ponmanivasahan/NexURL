Create Database IF NOT EXISTS nexurl;
use nexurl;

Create Table users(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email(email),
    INDEX idx_username(username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Create Table urls(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    short_code VARCHAR(10) NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    user_id BIGINT,
    custom_alias VARCHAR(50) UNIQUE,
    is_custom BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_short_code(short_code),
    INDEX idx_user_id(user_id),
    INDEX idx_custom_alias(custom_alias),
    INDEX idx_expires_at(expires_at),
    INDEX idx_created_at(created_at),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Create Table click_events(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    url_id BIGINT NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer_url TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    browser VARCHAR(50),
    device_type VARCHAR(50),
    os VARCHAR(100),

    INDEX idx_url_id(url_id),
    INDEX idx_clicked_at(clicked_at),
    INDEX idx_url_clicked(url_id,clicked_at),
    FOREIGN KEY(url_id) REFERENCES urls(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Create Table analytics_hourly(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    url_id BIGINT NOT NULL,
    hour_bucket TIMESTAMP NOT NULL,
    click_count INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    INDEX idx_url_hour(url_id,hour_bucket),
    UNIQUE KEY unique_url_hour (url_id,hour_bucket),
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Create Table analytics_daily(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    url_id BIGINT NOT NULL,
    date_bucket DATE NOT NULL,
    click_count INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,

    INDEX idx_url_date(url_id,date_bucket),
    UNIQUE KEY unique_url_date(url_id,date_bucket),
    FOREIGN KEY(url_id) REFERENCES urls(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Create Table rate_limits(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INT DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    INDEX idx_identifier_endpoint(identifier,endpoint,window_start)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Create Table api_keys(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit INT DEFAULT 1000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_api_key(api_key)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
