<<<<<<< 62c50a7124a58b925a572769ff14a6acd66bafd1
import * as fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import * as core from "@actions/core";
import axios, { isAxiosError } from "axios";
import { Git } from "./git.ts";
import { setupOctokit } from "./octokit.ts";
=======
import * as core from "@actions/core";
import { GitHub } from "./github.ts";
>>>>>>> 6062632720f5cc37f6dd36a095e8120c7682ca71
import readChangesetState from "./readChangesetState.ts";
import { runPublish, runVersion } from "./run.ts";
import {
  getOptionalInput,
  getRequiredInput,
  throwOnRemovedCommitModeInput,
  throwOnRenamedInputs,
  validateChangesetsCliVersion,
} from "./utils.ts";

try {
  await main();
} catch (err) {
  core.setFailed((err as Error).message);
}

<<<<<<< 62c50a7124a58b925a572769ff14a6acd66bafd1
async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let repoPrivate: boolean | undefined;

  if (eventPath && fsSync.existsSync(eventPath)) {
    const eventData = JSON.parse(fsSync.readFileSync(eventPath, "utf8"));
    repoPrivate = eventData?.repository?.private;
  }

  const upstream = "changesets/action";
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl =
    "https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions";

  core.info("");
  core.info("\u001b[1;36mStepSecurity Maintained Action\u001b[0m");
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false)
    core.info("\u001b[32m\u2713 Free for public repositories\u001b[0m");
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info("");

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const body: Record<string, string> = { action: action || "" };
  if (serverUrl !== "https://github.com") body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      { timeout: 3000 },
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`,
      );
      core.error(
        `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`,
      );
      process.exit(1);
    }
    core.info("Timeout or API not reachable. Continuing to next step.");
  }
}

(async () => {
  await validateSubscription();
  // to maintain compatibility with workflows created before github-token input was introduced
  // it's important to prefer the explicitly set GITHUB_TOKEN over the default token coming from github.token
  let githubToken = process.env.GITHUB_TOKEN || core.getInput("github-token");
=======
async function main() {
  const cwd = getOptionalInput("cwd") || process.cwd();
  await validateChangesetsCliVersion(cwd);
>>>>>>> 6062632720f5cc37f6dd36a095e8120c7682ca71

  throwOnRenamedInputs({
    publish: "publish-script",
    version: "version-script",
    commit: "commit-message",
    title: "pr-title",
    branch: "pr-base-branch",
    prDraft: "pr-draft",
    createGithubReleases: "create-github-releases",
  });
  throwOnRemovedCommitModeInput();

  const githubToken = getRequiredInput("github-token");
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== githubToken) {
    throw new Error(
      'The GITHUB_TOKEN environment variable is set and does not match the "github-token" input. ' +
        'Please pass the custom GitHub token to the "github-token" input and ' +
        "remove the GITHUB_TOKEN environment variable to avoid conflicts.",
    );
  }

  const pushWithGitCli = core.getBooleanInput("push-with-git-cli");
  const prDraft = getOptionalInput("pr-draft");
  if (prDraft !== undefined && prDraft !== "always" && prDraft !== "create") {
    core.setFailed(`Invalid pr-draft: ${prDraft}`);
    return;
  }
  const github = new GitHub({
    cwd,
    githubToken,
    pushWithGitCli,
  });

  let { changesets } = await readChangesetState(cwd);

  let publishScript = core.getInput("publish-script");
  let hasChangesets = changesets.length !== 0;
  const hasNonEmptyChangesets = changesets.some(
    (changeset) => changeset.releases.length > 0,
  );
  let hasPublishScript = !!publishScript;

  core.setOutput("published", "false");
  core.setOutput("published-packages", "[]");
  core.setOutput("has-changesets", String(hasChangesets));

  switch (true) {
    case !hasChangesets && !hasPublishScript:
      core.info(
        "No changesets present or were removed by merging version PR. Not publishing because publish-script is not set.",
      );
      return;
    case !hasChangesets && hasPublishScript: {
      core.info(
        "No changesets found. Attempting to publish any unpublished packages to npm",
      );

      const createGithubReleases = core.getBooleanInput(
        "create-github-releases",
      );
      const pushGitTags = core.getBooleanInput("push-git-tags");
      if (createGithubReleases && !pushGitTags) {
        throw new Error(
          "The input 'create-github-releases' is set to true, but 'push-git-tags' is set to false. " +
            "Creating GitHub releases requires pushing git tags. Please set 'push-git-tags' to true " +
            "or set 'create-github-releases' to false.",
        );
      }
      const result = await runPublish({
        script: publishScript,
        github,
        createGithubReleases,
        pushGitTags,
        cwd,
      });

      if (result.published) {
        core.setOutput("published", "true");
        core.setOutput(
          "published-packages",
          JSON.stringify(result.publishedPackages),
        );
      }

      if (result.exitCode !== 0) {
        throw new Error(
          `Publish command exited with code ${result.exitCode}${
            result.published
              ? `, but some packages were published: ${result.publishedPackages
                  .map((p) => `${p.name}@${p.version}`)
                  .join(", ")}`
              : ""
          }`,
        );
      }
      return;
    }
    case hasChangesets && !hasNonEmptyChangesets:
      core.info("All changesets are empty. Not creating PR");
      return;
    case hasChangesets: {
      const { pullRequestNumber } = await runVersion({
        script: getOptionalInput("version-script"),
        github,
        cwd,
        prTitle: getOptionalInput("pr-title"),
        commitMessage: getOptionalInput("commit-message"),
        hasPublishScript,
        prDraft,
        branch: getOptionalInput("pr-base-branch"),
      });

      core.setOutput("pr-number", String(pullRequestNumber));

      return;
    }
  }
}
