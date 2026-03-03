import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActivity } from "@/lib/activities";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const activity = getActivity(activityId);

  if (!activity) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12 lg:px-10">
        <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          {"<-"} Back to activities
        </Link>

        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {activity.level} · {activity.estimatedMinutes} minutes
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{activity.title}</h1>
          <p className="max-w-4xl text-base leading-7 text-slate-700">{activity.fullDescription}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle>Objective</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{activity.objective.title}</p>
              <p>{activity.objective.description}</p>
              <p>
                <span className="font-medium text-slate-900">Success criteria:</span>{" "}
                {activity.objective.successCriteria}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/95">
            <CardHeader>
              <CardTitle>Example Phrases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700">
                {activity.objective.examplePhrases.map((phrase) => (
                  <li key={phrase} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    {phrase}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/practice/${activity.id}`}>Start Practice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Choose a Different Activity</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
