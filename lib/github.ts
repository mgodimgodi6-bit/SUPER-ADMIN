import { App } from "@octokit/app";

const appId = process.env.GITHUB_APP_ID!;
const installationId = process.env.GITHUB_INSTALLATION_ID!;
const privateKey = process.env.GITHUB_PRIVATE_KEY!
  .replace(/\\n/g, "\n")
  .replace(/^"|"$/g, "");

export const githubApp = new App({
  appId,
  privateKey,
});

export async function getOctokit() {
  return await githubApp.getInstallationOctokit(Number(installationId));
}