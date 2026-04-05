import AnalysisResultPage from "@/features/pages/AnalysisResultPage";

export default async function AnalysisRoute({
  params,
}: {
  params: Promise<{ errorId: string }>;
}) {
  const { errorId } = await params;
  return <AnalysisResultPage errorId={errorId} />;
}
