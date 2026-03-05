import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#d9eadf_0%,_#f6f2e3_45%,_#fffef8_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 hover:text-emerald-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to activities
        </Link>

        <header className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/90 p-7 shadow-[0_20px_45px_-30px_rgba(20,83,45,0.55)] md:p-9">
          <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 left-12 h-40 w-40 rounded-full bg-amber-100/60 blur-2xl" />
          <div className="space-y-3">
            <p className="w-fit rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              {activity.level} · {activity.estimatedMinutes} minutes
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{activity.title}</h1>
            <p className="max-w-4xl text-base leading-7 text-slate-700">{activity.fullDescription}</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/30 shadow-[0_14px_26px_-24px_rgba(20,83,45,0.5)]">
            <CardHeader>
              <CardTitle>Objective</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">{activity.objective.title}</p>
              <p className="whitespace-pre-wrap">{activity.objective.description}</p>
              <p>
                <span className="font-medium text-slate-900">Success criteria:</span>{" "}
                {activity.objective.successCriteria}
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200/80 bg-gradient-to-b from-white to-amber-50/40 shadow-[0_14px_26px_-24px_rgba(120,53,15,0.45)]">
            <CardHeader>
              <CardTitle>Example Phrases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-700">
                {activity.objective.examplePhrases.map((phrase) => (
                  <li key={phrase} className="rounded-md border border-amber-200/70 bg-white px-3 py-2">
                    {phrase}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="min-w-40 bg-emerald-800 text-white hover:bg-emerald-700">
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
