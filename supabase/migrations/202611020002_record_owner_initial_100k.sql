-- Record the owner's documented initial coin purchase.
-- Evidence reviewed: completed 100,000-coin purchase receipt (EGP 68,340)
-- and account balance screen showing 100,000 coins.
-- Keep sellable quantity at zero until a real transfer/delivery test succeeds.

insert into public.inventory_lots (
  source,
  reference,
  quantity,
  available_quantity,
  status,
  notes
)
values (
  'owner_initial_purchase',
  'OWNER-INITIAL-100000-2026-11-01',
  100000,
  0,
  'verified',
  'Purchase evidence: completed Meeza receipt for 100,000 coins, EGP 68,340, dated 2026-11-01; account balance screenshot shows 100,000 coins. Ownership/purchase evidence recorded. Sellable quantity remains 0 pending successful supplier transfer/delivery test.'
)
on conflict (reference) do update
set quantity = excluded.quantity,
    available_quantity = 0,
    status = 'verified',
    notes = excluded.notes;
