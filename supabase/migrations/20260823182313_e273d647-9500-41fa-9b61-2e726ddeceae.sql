CREATE POLICY "admin_settings deny all"
ON public.admin_settings
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;