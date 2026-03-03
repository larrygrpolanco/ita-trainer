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

const phaseOneActivities = [
  {
    id: "clarify-rubric",
    title: "Clarifying a Rubric",
    description: "Office-hours confusion about partial credit.",
  },
  {
    id: "redirect-off-topic",
    title: "Redirecting Off-Topic",
    description: "Acknowledge and redirect without dismissing.",
  },
  {
    id: "manage-frustration",
    title: "Managing Frustration",
    description: "Respond with empathy and next steps.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <header className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            ITA Trainer - Phase 1
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Voice practice sandbox for interactional competence
          </h1>
          <p className="text-base leading-7 text-slate-600 md:text-lg">
            Start a test scenario to validate the LiveKit handshake end-to-end. The goal in this
            phase is simple: join a room and hear the student speak first.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {phaseOneActivities.map((activity) => (
            <Card key={activity.id} className="border-slate-200/80 bg-white/95">
              <CardHeader>
                <CardTitle>{activity.title}</CardTitle>
                <CardDescription>{activity.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Opens a LiveKit room using <code>{activity.id}</code> as the activity id.
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/practice/${activity.id}`}>Start Phase 1 Test</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
