CREATE TABLE `payments` (
  `id` VARCHAR(191) NOT NULL, `reference` VARCHAR(191) NOT NULL, `appointment_id` VARCHAR(191) NOT NULL,
  `salon_id` VARCHAR(191) NOT NULL, `provider` ENUM('MPESA') NOT NULL DEFAULT 'MPESA',
  `status` ENUM('CREATED','PENDING','HELD','FAILED','EXPIRED','DISPUTED','RELEASED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'CREATED',
  `phone` VARCHAR(191) NOT NULL, `amount` DECIMAL(12,2) NOT NULL, `commission_amount` DECIMAL(12,2) NOT NULL,
  `salon_amount` DECIMAL(12,2) NOT NULL, `provider_transaction_id` VARCHAR(191) NULL,
  `provider_code` VARCHAR(191) NULL, `provider_message` VARCHAR(191) NULL, `expires_at` DATETIME(3) NOT NULL,
  `paid_at` DATETIME(3) NULL, `released_at` DATETIME(3) NULL, `refunded_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `payments_reference_key` (`reference`), UNIQUE INDEX `payments_appointment_id_key` (`appointment_id`),
  UNIQUE INDEX `payments_provider_transaction_id_key` (`provider_transaction_id`), INDEX `payments_salon_id_status_idx` (`salon_id`,`status`),
  INDEX `payments_status_expires_at_idx` (`status`,`expires_at`),
  CONSTRAINT `payments_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payments_salon_id_fkey` FOREIGN KEY (`salon_id`) REFERENCES `salons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_events` (
  `id` VARCHAR(191) NOT NULL, `payment_id` VARCHAR(191) NOT NULL,
  `from_status` ENUM('CREATED','PENDING','HELD','FAILED','EXPIRED','DISPUTED','RELEASED','REFUNDED','CANCELLED') NULL,
  `to_status` ENUM('CREATED','PENDING','HELD','FAILED','EXPIRED','DISPUTED','RELEASED','REFUNDED','CANCELLED') NOT NULL,
  `source` VARCHAR(191) NOT NULL, `detail` TEXT NULL, `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), INDEX `payment_events_payment_id_created_at_idx` (`payment_id`,`created_at`),
  CONSTRAINT `payment_events_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `service_confirmations` (
  `id` VARCHAR(191) NOT NULL, `appointment_id` VARCHAR(191) NOT NULL, `pin_hash` VARCHAR(191) NOT NULL,
  `qr_token_hash` VARCHAR(191) NOT NULL, `failed_attempts` INTEGER NOT NULL DEFAULT 0, `expires_at` DATETIME(3) NOT NULL,
  `confirmed_at` DATETIME(3) NULL, `confirmed_by_id` VARCHAR(191) NULL, `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE INDEX `service_confirmations_appointment_id_key` (`appointment_id`),
  UNIQUE INDEX `service_confirmations_qr_token_hash_key` (`qr_token_hash`),
  CONSTRAINT `service_confirmations_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `service_confirmations_confirmed_by_id_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
