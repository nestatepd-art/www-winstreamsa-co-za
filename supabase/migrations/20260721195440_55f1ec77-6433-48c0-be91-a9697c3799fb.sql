
CREATE POLICY "Authenticated read business logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'business-logos');

CREATE POLICY "Users upload own business logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own business logo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own business logo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
