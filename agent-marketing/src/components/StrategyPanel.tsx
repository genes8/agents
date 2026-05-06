import type { CampaignStrategy } from "../lib/campaign/types";
import { CopyButton } from "./CopyButton";

type StrategyPanelProps = {
  strategy: CampaignStrategy | null;
};

function SectionHeader({ title, copyText }: { title: string; copyText: string }) {
  return (
    <div className="section-hdr">
      <h3>{title}</h3>
      <CopyButton text={copyText} />
    </div>
  );
}

export function StrategyPanel({ strategy }: StrategyPanelProps) {
  if (!strategy) {
    return (
      <section className="card muted-card">
        <div className="card-hd">
          <p className="step-tag">Step 2</p>
          <h2>Strategy Core</h2>
          <p>Generate the strategy first. Social modules unlock after positioning is set.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Step 2</p>
        <h2>Strategy Core</h2>
      </div>
      <div className="card-bd">
        <SectionHeader title="Market summary" copyText={strategy.marketSummary} />
        <p>{strategy.marketSummary}</p>

        <SectionHeader title="ICP" copyText={strategy.icp} />
        <p>{strategy.icp}</p>

        <SectionHeader title="Positioning" copyText={strategy.positioningStatement} />
        <p>{strategy.positioningStatement}</p>

        <SectionHeader title="Pain points" copyText={strategy.painPoints.join("\n")} />
        <ul>
          {strategy.painPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>

        <SectionHeader title="Hooks" copyText={strategy.hooks.join("\n")} />
        <ul>
          {strategy.hooks.map((hook, i) => (
            <li key={i}>{hook}</li>
          ))}
        </ul>

        <SectionHeader
          title="Channel strategy"
          copyText={`X: ${strategy.channelStrategy.x}\nLinkedIn: ${strategy.channelStrategy.linkedin}\nInstagram: ${strategy.channelStrategy.instagram}`}
        />
        <ul>
          <li><strong>X —</strong> {strategy.channelStrategy.x}</li>
          <li><strong>LinkedIn —</strong> {strategy.channelStrategy.linkedin}</li>
          <li><strong>Instagram —</strong> {strategy.channelStrategy.instagram}</li>
        </ul>
      </div>
    </section>
  );
}
