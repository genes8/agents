import type { CampaignModule, CampaignModuleOutput, CampaignStrategy } from "../lib/campaign/types";
import { CopyButton } from "./CopyButton";

type ModuleWorkbenchProps = {
  strategy: CampaignStrategy | null;
  modules: CampaignModuleOutput[];
  generatedKinds: Set<CampaignModule>;
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

function formatModuleText(output: CampaignModuleOutput): string {
  const lines = [`# ${output.title}`, "", output.summary, ""];
  for (const section of output.sections) {
    lines.push(`## ${section.title}`);
    for (const item of section.items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function ModuleWorkbench({ strategy, modules: outputs, generatedKinds, disabled, onGenerate }: ModuleWorkbenchProps) {
  return (
    <section className="card">
      <div className="card-hd">
        <p className="step-tag">Step 3</p>
        <h2>Module workbench</h2>
        <p>Select modules to generate. Strategy Core must exist first.</p>
      </div>
      <div className="card-bd">
        <div className="module-grid">
          {availableModules.map((module) => {
            const isGenerated = generatedKinds.has(module.id);
            return (
              <button
                className={`secondary-button${isGenerated ? " secondary-button--active" : ""}`}
                disabled={!strategy || disabled}
                key={module.id}
                onClick={() => onGenerate(module.id)}
                type="button"
              >
                {module.label}{isGenerated ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        {outputs.length > 0 && (
          <div className="output-stack">
            {outputs.map((output) => (
              <article className="output-card" key={`${output.module}-${output.title}`}>
                <div className="section-hdr">
                  <h3>{output.title}</h3>
                  <CopyButton text={formatModuleText(output)} label="Copy module" />
                </div>
                <p>{output.summary}</p>
                {output.sections.map((section, si) => (
                  <div key={si}>
                    <div className="section-hdr">
                      <h4>{section.title}</h4>
                      <CopyButton text={section.items.join("\n")} />
                    </div>
                    <ul>
                      {section.items.map((item, ii) => (
                        <li key={ii}>{item}</li>
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
