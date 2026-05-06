import { useState } from "react";
import type { CampaignModule, CampaignModuleOutput, CampaignStrategy } from "../lib/campaign/types";
import { CopyButton } from "./CopyButton";

type ModuleWorkbenchProps = {
  strategy: CampaignStrategy | null;
  modules: CampaignModuleOutput[];
  generatedKinds: Set<CampaignModule>;
  disabled: boolean;
  onGenerate: (module: CampaignModule) => void;
  moduleIds?: Map<CampaignModule, string>;
  onRefine?: (moduleId: string, instruction: string) => Promise<void>;
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

type RefineState = Record<string, { open: boolean; text: string; busy: boolean }>;

export function ModuleWorkbench({ strategy, modules: outputs, generatedKinds, disabled, onGenerate, moduleIds, onRefine }: ModuleWorkbenchProps) {
  const [refineState, setRefineState] = useState<RefineState>({});

  function toggleRefine(moduleKind: CampaignModule) {
    setRefineState((prev) => ({
      ...prev,
      [moduleKind]: { open: !prev[moduleKind]?.open, text: prev[moduleKind]?.text ?? "", busy: false },
    }));
  }

  async function submitRefine(moduleKind: CampaignModule) {
    const moduleId = moduleIds?.get(moduleKind);
    const instruction = refineState[moduleKind]?.text?.trim();
    if (!moduleId || !instruction || !onRefine) return;

    setRefineState((prev) => ({ ...prev, [moduleKind]: { ...prev[moduleKind], busy: true } }));
    try {
      await onRefine(moduleId, instruction);
      setRefineState((prev) => ({ ...prev, [moduleKind]: { open: false, text: "", busy: false } }));
    } catch {
      setRefineState((prev) => ({ ...prev, [moduleKind]: { ...prev[moduleKind], busy: false } }));
    }
  }

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
            {outputs.map((output) => {
              const rs = refineState[output.module];
              const canRefine = Boolean(moduleIds?.get(output.module) && onRefine);
              return (
                <article className="output-card" key={`${output.module}-${output.title}`}>
                  <div className="section-hdr">
                    <h3>{output.title}</h3>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {canRefine && (
                        <button
                          className="secondary-button"
                          disabled={rs?.busy}
                          onClick={() => toggleRefine(output.module)}
                          type="button"
                        >
                          {rs?.open ? "Cancel" : "Refine"}
                        </button>
                      )}
                      <CopyButton text={formatModuleText(output)} label="Copy module" />
                    </div>
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
                  {rs?.open && (
                    <div style={{ marginTop: "12px", display: "grid", gap: "6px" }}>
                      <textarea
                        disabled={rs.busy}
                        onChange={(e) =>
                          setRefineState((prev) => ({
                            ...prev,
                            [output.module]: { ...prev[output.module], text: e.target.value },
                          }))
                        }
                        placeholder="Instruction — e.g. 'make this more concise' or 'add a stronger CTA'"
                        rows={2}
                        value={rs.text}
                      />
                      <button
                        className="secondary-button"
                        disabled={rs.busy || !rs.text.trim()}
                        onClick={() => void submitRefine(output.module)}
                        type="button"
                      >
                        {rs.busy ? "Refining..." : "Apply"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
