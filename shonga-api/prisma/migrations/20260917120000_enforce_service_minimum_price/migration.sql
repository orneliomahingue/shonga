-- Bring legacy rows into the valid range before enabling the constraint.
UPDATE `services`
SET `price` = 10.00
WHERE `price` < 10.00;

-- Keep the business rule enforced even for writes made outside the API.
ALTER TABLE `services`
ADD CONSTRAINT `services_price_min_10_check`
CHECK (`price` >= 10.00);
