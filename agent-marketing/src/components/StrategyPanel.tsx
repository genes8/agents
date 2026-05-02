import type { CampaignStrategy } from "../lib/campaign/types";

type StrategyPanelProps = {
  strategy: CampaignStrategy | null;
};

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
        <h3>Market summary</h3>
        <p>{strategy.marketSummary}</p>

        <h3>ICP</h3>
        <p>{strategy.icp}</p>

        <h3>Positioning</h3>
        <p>{strategy.positioningStatement}</p>

        <h3>Pain points</h3>
        <ul>
          {strategy.painPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <h3>Hooks</h3>
        <ul>
          {strategy.hooks.map((hook) => (
            <li key={hook}>{hook}</li>
          ))}
        </ul>

        <h3>Channel strategy</h3>
        <ul>
          <li><strong>X —</strong> {strategy.channelStrategy.x}</li>
          <li><strong>LinkedIn —</strong> {strategy.channelStrategy.linkedin}</li>
          <li><strong>Instagram —</strong> {strategy.channelStrategy.instagram}</li>
        </ul>
      </div>
    </section>
  );
}
