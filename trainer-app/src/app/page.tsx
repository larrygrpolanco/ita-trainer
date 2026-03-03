import { activities } from "@/lib/activities";
import { ActivityCard } from "@/components/ActivityCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-16">

        {/* Hero */}
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Interactional Competence Trainer
          </h1>
          <p className="text-muted-foreground leading-relaxed text-base max-w-2xl">
            Teaching isn&apos;t just about knowing your subject — it&apos;s about
            managing conversations with students in real time. This tool lets you
            practice the interactional skills that matter most: explaining clearly,
            checking for understanding, handling tough questions, and redirecting
            gracefully.
          </p>
          <p className="text-muted-foreground leading-relaxed text-sm max-w-2xl">
            Based on research into the interactional demands of ITA teaching
            assessments.
          </p>
        </section>

        {/* What is Interactional Competence */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            What is Interactional Competence?
          </h2>
          <div className="space-y-3">
            <div className="pl-4 border-l-2 border-muted-foreground/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">
                  Competence is co-constructed.
                </span>{" "}
                It&apos;s not just what you say — it&apos;s how the conversation
                unfolds. A TA who understands their material but can&apos;t manage
                the exchange is still struggling.
              </p>
            </div>
            <div className="pl-4 border-l-2 border-muted-foreground/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">
                  Specific skills matter.
                </span>{" "}
                Encouraging questions, providing clear answers, checking
                comprehension, and managing off-topic or difficult responses — these
                are distinct moves that can be practiced.
              </p>
            </div>
            <div className="pl-4 border-l-2 border-muted-foreground/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">
                  Practice makes the difference.
                </span>{" "}
                These skills don&apos;t come from reading about them. They develop
                through repeated exposure to realistic interactions — with feedback.
              </p>
            </div>
          </div>
        </section>

        {/* Activities */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Activities</h2>
          <p className="text-sm text-muted-foreground">
            Click an activity to see the full description, then start a voice
            practice session.
          </p>
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
