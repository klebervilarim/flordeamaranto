DROP POLICY IF EXISTS "rimg public read" ON public.review_images;
CREATE POLICY "rimg public read" ON public.review_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id = review_images.review_id
      AND (r.approved = true OR r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);