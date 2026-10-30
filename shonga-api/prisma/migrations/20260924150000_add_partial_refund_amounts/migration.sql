ALTER TABLE `payments`
  ADD COLUMN `refund_amount` DECIMAL(12,2) NULL,
  ADD COLUMN `transaction_fee_amount` DECIMAL(12,2) NULL;
