import type { CampaignModule, CampaignModuleOutput, CampaignStrategy } from "../lib/campaign/types";

type ModuleWorkbenchProps = {
  strategy: CampaignStrategy | null;
  modules: CampaignModuleOutput[];
  disabled: boolean;
  onGenerate: (module: CampaignModule) => void;
};

const availableModules: Array<{ id: CampaignModule; label: string }> = [
  { id: "x", label: "X Campaign" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "calendar", label: "7/14-Day Calendar" },
  { id: "creative", label: "Creative Briefs" },
];

export function ModuleWorkbench({ strategy, modules: outputs, disabled, onGenerate }: ModuleWorkbenchProps) {
  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Step 3</p>
        <h2>Module workbench</h2>
        <p>Select modules to generate. Strategy Core must exist first.</p>
      </div>
      <div className="card-bd">
        <div className="module-grid">
          {availableModules.map((module) => (
            <button
              className="secondary-button"
              disabled={!strategy || disabled}
              key={module.id}
              onClick={() => onGenerate(module.id)}
              type="button"
            >
              {module.label}
            </button>
          ))}
        </div>

        {outputs.length > 0 && (
          <div className="output-stack">
            {outputs.map((output) => (
              <article className="output-card" key={`${output.module}-${output.title}`}>
                <h3>{output.title}</h3>
                <p>{output.summary}</p>
                {output.sections.map((section) => (
                  <div key={section.title}>
                    <h4>{section.title}</h4>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
