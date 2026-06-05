-- 1. Arreglar public.custom_roles (Eliminar política duplicada para INSERT)
DROP POLICY IF EXISTS "Authenticated Insert Custom Roles" ON public.custom_roles;
