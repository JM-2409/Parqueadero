UPDATE public.parking_lots
SET plan_id = (
  SELECT id
  FROM public.subscription_plans
  WHERE name = 'Básico'
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE plan_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.subscription_plans
    WHERE name = 'Básico'
      AND is_active = true
  );
