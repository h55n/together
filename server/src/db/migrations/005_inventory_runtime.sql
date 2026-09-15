-- Inventory runtime safety for Together V1 grocery/cooking transactions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventories_owner_item
  ON inventories(owner_type, owner_id, item_id);
