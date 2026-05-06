import { getDb, DEFAULT_USER_ID } from "../db/client";
import { createCampaign, getCampaign, listCampaigns, upsertModule, updateWorkflowState } from "../db/repositories/campaigns";
import { createRun, completeRun, failRun } from "../db/repositories/runs";
import { getSourcesByCampaign } from "../db/repositories/sources";
import { getExportEventsByCampaign, saveExportEvent } from "../db/repositories/exports";
import { getQcReviewsByCampaign } from "../db/repositories/qc-reviews";
import { saveMessage, getMessagesByCampaign } from "../db/repositories/messages";
import { refineCampaignOutput } from "../agents/orchestrator";
import { executeGenerateStrategyNode } from "./nodes/generate-strategy-node";
import { executeGenerateModuleNode } from "./nodes/generate-module-node";
export async function createCampaignHandler(brief, userId = DEFAULT_USER_ID) {
    const db = getDb();
    return createCampaign(db, { brief, userId });
}
export async function getCampaignHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    return getCampaign(db, campaignId, userId);
}
export async function listCampaignsHandler(userId = DEFAULT_USER_ID) {
    const db = getDb();
    return listCampaigns(db, userId);
}
export async function generateStrategyHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    const run = await createRun(db, {
        campaignId,
        nodeName: "generate_strategy",
        model: process.env.OPENAI_DEFAULT_MODEL,
        stateBefore: workspace.workflowState,
    });
    const start = Date.now();
    try {
        await executeGenerateStrategyNode(db, { campaignId, brief: workspace.brief, runId: run.id });
        await completeRun(db, run.id, { stateAfter: "strategy_ready", latencyMs: Date.now() - start });
        const updated = await getCampaign(db, campaignId, userId);
        return updated;
    }
    catch (e) {
        await failRun(db, run.id, {
            type: "generation_error",
            message: e instanceof Error ? e.message : "Unknown error",
            latencyMs: Date.now() - start,
        });
        throw e;
    }
}
export async function generateModuleHandler(campaignId, module, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    if (!workspace.strategy)
        throw new Error(`Campaign ${campaignId} has no strategy yet`);
    const run = await createRun(db, {
        campaignId,
        nodeName: `generate_module_${module}`,
        model: process.env.OPENAI_DEFAULT_MODEL,
        stateBefore: workspace.workflowState,
    });
    const start = Date.now();
    try {
        const result = await executeGenerateModuleNode(db, {
            campaignId,
            brief: workspace.brief,
            strategy: workspace.strategy,
            module,
            runId: run.id,
            previousWorkflowState: workspace.workflowState,
        });
        const finalState = result.workflowState;
        await completeRun(db, run.id, { stateAfter: finalState, latencyMs: Date.now() - start });
        await updateWorkflowState(db, campaignId, finalState);
        const updated = await getCampaign(db, campaignId, userId);
        return updated;
    }
    catch (e) {
        await failRun(db, run.id, {
            type: "generation_error",
            message: e instanceof Error ? e.message : "Unknown error",
            latencyMs: Date.now() - start,
        });
        throw e;
    }
}
export async function refineModuleHandler(campaignId, moduleId, instruction, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    if (!workspace.strategy)
        throw new Error(`Campaign ${campaignId} has no strategy yet`);
    const mod = workspace.modules.find((m) => m.id === moduleId);
    if (!mod)
        throw new Error(`Module not found: ${moduleId}`);
    const run = await createRun(db, {
        campaignId,
        nodeName: `refine_module_${mod.moduleKind}`,
        model: process.env.OPENAI_DEFAULT_MODEL,
        stateBefore: workspace.workflowState,
    });
    const start = Date.now();
    try {
        const originalText = mod.output.sections.flatMap((s) => s.items).join("\n");
        const refined = await refineCampaignOutput({
            strategy: workspace.strategy,
            originalText,
            instruction,
        });
        const updatedOutput = {
            ...mod.output,
            summary: refined.revisedText,
        };
        await upsertModule(db, campaignId, mod.moduleKind, updatedOutput);
        await completeRun(db, run.id, { latencyMs: Date.now() - start });
        const updated = await getCampaign(db, campaignId, userId);
        return updated;
    }
    catch (e) {
        await failRun(db, run.id, {
            type: "refinement_error",
            message: e instanceof Error ? e.message : "Unknown error",
            latencyMs: Date.now() - start,
        });
        throw e;
    }
}
export async function getSourcesHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        return [];
    return getSourcesByCampaign(db, campaignId);
}
export async function getQcReviewsHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        return [];
    return getQcReviewsByCampaign(db, campaignId);
}
export async function approveQcHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    await updateWorkflowState(db, campaignId, "approved");
    const updated = await getCampaign(db, campaignId, userId);
    return updated;
}
export async function rejectQcHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    await updateWorkflowState(db, campaignId, "modules_ready");
    const updated = await getCampaign(db, campaignId, userId);
    return updated;
}
export async function getMessagesHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        return [];
    return getMessagesByCampaign(db, campaignId);
}
export async function getExportEventsHandler(campaignId, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        return [];
    return getExportEventsByCampaign(db, campaignId);
}
export async function chatHandler(campaignId, content, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    await saveMessage(db, campaignId, { role: "user", content });
    const refinementTarget = resolveRefinementTarget(content, workspace.modules);
    if (refinementTarget.kind === "ambiguous") {
        await saveMessage(db, campaignId, {
            role: "assistant",
            content: "Which module should I refine: linkedin, x, instagram, calendar, or creative?",
        });
        return { messages: await getMessagesByCampaign(db, campaignId) };
    }
    if (refinementTarget.kind === "target") {
        const mod = refinementTarget.module;
        const run = await createRun(db, {
            campaignId,
            nodeName: `chat_refine_${mod.moduleKind}`,
            model: process.env.OPENAI_DEFAULT_MODEL,
            stateBefore: workspace.workflowState,
        });
        const start = Date.now();
        try {
            if (!workspace.strategy)
                throw new Error(`Campaign ${campaignId} has no strategy yet`);
            const originalText = mod.output.sections.flatMap((s) => s.items).join("\n") || mod.output.summary;
            const refined = await refineCampaignOutput({
                strategy: workspace.strategy,
                originalText,
                instruction: content,
            });
            await upsertModule(db, campaignId, mod.moduleKind, {
                ...mod.output,
                summary: refined.revisedText,
            });
            await completeRun(db, run.id, { stateAfter: workspace.workflowState, latencyMs: Date.now() - start });
            await saveMessage(db, campaignId, {
                role: "assistant",
                content: refined.changeSummary || `Refined ${mod.moduleKind}.`,
                messageType: "refinement",
                moduleId: mod.id,
                runId: run.id,
            });
            return { messages: await getMessagesByCampaign(db, campaignId) };
        }
        catch (e) {
            await failRun(db, run.id, {
                type: "refinement_error",
                message: e instanceof Error ? e.message : "Unknown error",
                latencyMs: Date.now() - start,
            });
            await saveMessage(db, campaignId, {
                role: "assistant",
                content: `I couldn't refine ${mod.moduleKind}. Please try again or narrow the instruction.`,
                messageType: "refinement",
                moduleId: mod.id,
                runId: run.id,
            });
            return { messages: await getMessagesByCampaign(db, campaignId) };
        }
    }
    const context = [
        "You are a GTM strategy assistant helping refine a startup marketing campaign.",
        "Campaign brief:",
        JSON.stringify(workspace.brief, null, 2),
        workspace.strategy ? `Strategy summary: ${workspace.strategy.positioningStatement}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
    const previousMessages = await getMessagesByCampaign(db, campaignId, 20);
    const { getLlmConfig, createLlmClient } = await import("../llm/client");
    const config = getLlmConfig();
    const client = createLlmClient(config);
    const chatMessages = [
        { role: "system", content: context },
        ...previousMessages.map((message) => ({
            role: (message.role === "user" ? "user" : "assistant"),
            content: message.content,
        })),
    ];
    const response = await client.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: chatMessages,
    });
    const assistantContent = response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
    await saveMessage(db, campaignId, { role: "assistant", content: assistantContent });
    return { messages: await getMessagesByCampaign(db, campaignId) };
}
function resolveRefinementTarget(content, modules) {
    if (!isRefinementIntent(content))
        return { kind: "none" };
    if (modules.length === 0)
        return { kind: "none" };
    if (modules.length === 1)
        return { kind: "target", module: modules[0] };
    const normalized = content.toLowerCase();
    const namedModule = modules.find((module) => normalized.includes(module.moduleKind));
    if (namedModule)
        return { kind: "target", module: namedModule };
    return { kind: "ambiguous" };
}
function isRefinementIntent(content) {
    return /make this more|rewrite this|refine this|turn this into/i.test(content);
}
export async function recordExportHandler(campaignId, format, userId = DEFAULT_USER_ID) {
    const db = getDb();
    const workspace = await getCampaign(db, campaignId, userId);
    if (!workspace)
        throw new Error(`Campaign not found: ${campaignId}`);
    if (workspace.workflowState !== "approved" && workspace.workflowState !== "exported") {
        throw new Error(`Campaign ${campaignId} must be approved before export`);
    }
    await saveExportEvent(db, { campaignId, userId, format });
    await updateWorkflowState(db, campaignId, "exported");
    const updated = await getCampaign(db, campaignId, userId);
    return updated;
}
