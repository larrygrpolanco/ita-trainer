import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8f0_0%,_#f8fafc_42%,_#ffffff_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 lg:px-10">
        <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-sm md:p-10">
          <div className="max-w-4xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ITA voice practice</p>
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
            <Card key={activity.id} className="h-full border-slate-200/80 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <CardTitle>{activity.title}</CardTitle>
                <CardDescription>{activity.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">Focus: {activity.objective.title}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
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
