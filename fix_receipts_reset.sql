-- Remove REC- prefix and leading zeros from existing receipts
UPDATE parking_sessions
SET receipt_number = regexp_replace(receipt_number, '^REC-0*', '')
WHERE receipt_number LIKE 'REC-%';

-- Reset the receipt sequence for all parking lots
UPDATE parking_lots
SET receipt_sequence = 0;
