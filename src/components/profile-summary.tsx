import { formatWindow } from "@/lib/availability";
import { regionLabel, type Region } from "@/lib/regions";
import type { FullProfile } from "@/server/profile/service";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-muted text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ProfileSummary({ profile }: { profile: FullProfile }) {
  return (
    <div className="space-y-8">
      <Section title="Identity">
        <dl className="space-y-1 text-sm">
          <div className="flex gap-3">
            <dt className="text-muted w-24 shrink-0">Name</dt>
            <dd>{profile.displayName}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted w-24 shrink-0">Region</dt>
            <dd>{regionLabel(profile.region as Region)}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted w-24 shrink-0">Languages</dt>
            <dd>{profile.languages.join(", ")}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-muted w-24 shrink-0">Timezone</dt>
            <dd>{profile.timezone}</dd>
          </div>
          {profile.bio ? (
            <div className="flex gap-3">
              <dt className="text-muted w-24 shrink-0">Bio</dt>
              <dd className="min-w-0">{profile.bio}</dd>
            </div>
          ) : null}
        </dl>
      </Section>

      <Section title="Games">
        <ul className="space-y-2">
          {profile.games.map((entry) => (
            <li key={entry.id} className="border-border rounded-lg border px-3 py-2 text-sm">
              <span className="font-medium">{entry.game.name}</span>
              <span className="text-muted">
                {" "}
                — {entry.rank} · {entry.roles.join(", ")} · {entry.playStyle.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Availability">
        <ul className="space-y-0.5 text-sm">
          {profile.availability.map((window) => (
            <li key={window.id}>
              {formatWindow({
                dayOfWeek: window.dayOfWeek,
                startMinute: window.startMinute,
                endMinute: window.endMinute,
              })}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
