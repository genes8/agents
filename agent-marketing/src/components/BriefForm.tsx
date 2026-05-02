import type { CampaignBrief, CampaignGoal } from "../lib/campaign/types";

type BriefFormProps = {
  brief: CampaignBrief;
  disabled: boolean;
  onChange: (brief: CampaignBrief) => void;
  onSubmit: () => void;
};

const campaignGoals: CampaignGoal[] = ["awareness", "waitlist", "signup", "demo", "launch"];

export function BriefForm({ brief, disabled, onChange, onSubmit }: BriefFormProps) {
  return (
    <form
      className="card form-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="card-hd">
        <p className="step-tag">Step 1</p>
        <h2>Startup brief</h2>
        <p>Give the agent enough context to build a strategy before writing posts.</p>
      </div>

      <div className="card-bd fields">
        <label>
          Startup name
          <input
            required
            placeholder="e.g. SignalForge"
            value={brief.startupName}
            onChange={(event) => onChange({ ...brief, startupName: event.target.value })}
          />
        </label>

        <label>
          What does the product do?
          <textarea
            required
            rows={3}
            placeholder="Describe the core product in 2-3 sentences."
            value={brief.productDescription}
            onChange={(event) => onChange({ ...brief, productDescription: event.target.value })}
          />
        </label>

        <label>
          Target audience
          <input
            required
            placeholder="e.g. B2B SaaS founders, series A"
            value={brief.targetAudience}
            onChange={(event) => onChange({ ...brief, targetAudience: event.target.value })}
          />
        </label>

        <label>
          Problem solved
          <textarea
            required
            rows={2}
            placeholder="What pain point does it eliminate?"
            value={brief.problemSolved}
            onChange={(event) => onChange({ ...brief, problemSolved: event.target.value })}
          />
        </label>

        <label>
          Campaign goal
          <select
            value={brief.campaignGoal}
            onChange={(event) => onChange({ ...brief, campaignGoal: event.target.value as CampaignGoal })}
          >
            {campaignGoals.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
        </label>

        <label>
          Landing page URL
          <input
            placeholder="https://example.com"
            value={brief.landingPageUrl ?? ""}
            onChange={(event) => onChange({ ...brief, landingPageUrl: event.target.value })}
          />
        </label>

        <label>
          Competitors
          <input
            placeholder="Clay, Apollo, Notion — comma separated"
            value={brief.competitors.join(", ")}
            onChange={(event) =>
              onChange({
                ...brief,
                competitors: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>

        <label>
          Tone
          <input
            placeholder="sharp, credible, founder-led"
            value={brief.tone.join(", ")}
            onChange={(event) =>
              onChange({
                ...brief,
                tone: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>

        <label>
          Extra context
          <textarea
            rows={3}
            placeholder="Funding stage, recent traction, key differentiators..."
            value={brief.extraContext ?? ""}
            onChange={(event) => onChange({ ...brief, extraContext: event.target.value })}
          />
        </label>

        <button className="primary-button" disabled={disabled} type="submit">
          Generate Strategy Core
        </button>
      </div>
    </form>
  );
}
