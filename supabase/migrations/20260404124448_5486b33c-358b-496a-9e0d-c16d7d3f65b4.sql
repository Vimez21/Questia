
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

CREATE POLICY "Users can upload own question images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own question images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'question-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own question images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'question-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read for question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');
