"use client";

import { ChipGroup } from "@/components/chip-group";
import { Field, inputClass } from "@/components/field";
import { LANGUAGES } from "@/lib/languages";
import { REGION_KEYS, regionLabel, type Region } from "@/lib/regions";

import type { WizardData } from "./types";

const TIME_ZONES: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

type Props = {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
};

export function StepBasics({ data, update }: Props) {
  return (
    <div className="space-y-6">
      <Field label="Display name" htmlFor="displayName" hint="How teammates will see you.">
        <input
          id="displayName"
          className={inputClass}
          maxLength={32}
          value={data.displayName}
          onChange={(e) => update({ displayName: e.target.value })}
          placeholder="e.g. Nova"
        />
      </Field>

      <Field label="Region" htmlFor="region" hint="Where you get your best ping.">
        <select
          id="region"
          className={inputClass}
          value={data.region}
          onChange={(e) => update({ region: e.target.value as Region })}
        >
          <option value="" disabled>
            Select a region
          </option>
          {REGION_KEYS.map((key) => (
            <option key={key} value={key}>
              {regionLabel(key)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Languages" hint="Pick up to 5. First one is your primary.">
        <ChipGroup
          aria-label="Languages"
          options={LANGUAGES}
          selected={data.languages}
          max={5}
          onToggle={(lang) =>
            update({
              languages: data.languages.includes(lang)
                ? data.languages.filter((l) => l !== lang)
                : [...data.languages, lang],
            })
          }
        />
      </Field>

      <Field
        label="Timezone"
        htmlFor="timezone"
        hint="Used to line up your availability with others."
      >
        {TIME_ZONES.length > 0 ? (
          <select
            id="timezone"
            className={inputClass}
            value={data.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
          >
            {TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="timezone"
            className={inputClass}
            value={data.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
          />
        )}
      </Field>

      <Field label="Bio" htmlFor="bio" hint="Optional. 280 characters.">
        <textarea
          id="bio"
          className={inputClass}
          rows={3}
          maxLength={280}
          value={data.bio}
          onChange={(e) => update({ bio: e.target.value })}
          placeholder="Comms style, what you're looking for, mic setup…"
        />
      </Field>
    </div>
  );
}
