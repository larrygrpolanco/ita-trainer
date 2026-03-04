import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllActivities } from "@/lib/activities";

export default function Home() {
  const activities = getAllActivities();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#d9eadf_0%,_#f6f2e3_45%,_#fffef8_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 lg:px-10">
        <header className="relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-white/90 p-7 shadow-[0_18px_45px_-28px_rgba(20,83,45,0.45)] md:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/80 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 left-8 h-36 w-36 rounded-full bg-amber-100/70 blur-2xl" />
          <div className="relative max-w-4xl space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              ITA voice practice
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Build classroom communication confidence before your next real interaction
            </h1>
            <p className="text-base leading-7 text-slate-600 md:text-lg">
              Choose a short scenario, practice with an AI student, and get coaching feedback after each round.
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activities.map((activity) => (
            <Card
              key={activity.id}
              className="h-full border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/30 shadow-[0_16px_30px_-24px_rgba(20,83,45,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_35px_-22px_rgba(20,83,45,0.6)]"
            >
              <CardHeader>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                    Guided activity
                  </p>
                  <p className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                    {activity.level}
                  </p>
                </div>
                <CardTitle>{activity.title}</CardTitle>
                <CardDescription>{activity.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2 text-sm text-slate-700">
                  Focus: <span className="font-medium text-emerald-900">{activity.objective.title}</span>
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-emerald-800 text-white hover:bg-emerald-700">
                  <Link href={`/activities/${activity.id}`}>View Activity</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
