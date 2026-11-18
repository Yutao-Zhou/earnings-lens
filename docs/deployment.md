# GitHub Pages Deployment

## Hosting model

The public `Yutao-Zhou/earnings-lens` repository contains application source and technical documentation. A GitHub Actions workflow builds and hosts the generated site directly from this repository. Product plans and private research instructions remain outside the source repository and website artifacts.

The website is live at [https://yutaozhou.com/earnings-lens/](https://yutaozhou.com/earnings-lens/). The [GitHub Pages project URL](https://yutao-zhou.github.io/earnings-lens/) redirects to that address through the account's existing custom-domain configuration.

## Initial configuration

In repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. The administrative setup is performed once; it does not belong in the browser application.

The workflow is `.github/workflows/pages.yml`. It runs on pushes to `main`, pull requests, and manual dispatch. Pull requests run validation, tests, and builds without deploying. A main-branch push or manual run on main publishes the generated artifact after successful checks.

## Build and deployment boundary

1. Check out the current source with read-only repository access.
2. Install locked build dependencies under Node.js 24.
3. Run `npm run validate`, `npm test`, and `npm run build`.
4. Upload only `dist/` as the Pages artifact.
5. Deploy from the `github-pages` environment using Pages write and short-lived identity-token permissions.

Do not upload repository contents, documentation directories, raw source material, task state, credentials, or planning records as a Pages artifact. No separate publication repository or persistent deployment credential is required.

## Updating the website

Update validated report JSON or application source, run the local checks, commit, and push to `main`. GitHub Actions performs the website build and deployment. An unchanged JSON format does not require editing the page template.

A successful source push is not proof that the public website is current. Check the workflow's build and deploy jobs and open the returned public HTTPS address. Preserve a known good deployment if a new build fails; rerun a failed workflow when the cause is transient.

## Verification

Confirm that the public page renders, navigation and evidence expansion work, the expected report revision is displayed, and no runtime data endpoint is required. The website currently contains clearly labeled fictional demonstration data until production reports are integrated.

The initial deployment passed all build and deployment steps in [workflow run 44224697521](https://github.com/Yutao-Zhou/earnings-lens/actions/runs/44224697521). Anonymous requests to both URLs returned HTTP 200 at the custom-domain destination. The embedded report JSON and application script matched the local artifact, and browser checks confirmed company selection, financial tables, and evidence expansion.

## Custom-domain behavior

The account's existing domain configuration is inherited by the project. No root-domain DNS or Pages configuration was changed for this deployment. Public HTTPS works with a valid connection at the custom domain. The project-level HTTPS enforcement request was declined because GitHub did not yet have a project certificate; do not assume that the Pages API enforcement flag is enabled.

The custom-domain edge adds security markup to responses, so whole-response HTML hashes can vary. Verify the embedded application data and script, or use the workflow artifact for byte-for-byte comparisons. Edge-added markup is not part of the generated standalone HTML.
