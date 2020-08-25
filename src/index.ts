// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install()
import { Application } from 'probot'

import { fetchConfiguration, isOrgMember } from './helpers'

export = (app: Application): void => {
  app.on(
    'issues.opened',
    async (context): Promise<void> => {
      const config = await fetchConfiguration(context)
      const user = context.payload.issue.user

      if (!config.newIssueWelcomeComment) {
        return
      }

      if (config.ignoreBots && user.type === 'Bot') {
        context.log.info(`User is a bot, ignoring`)
        return
      }

      if (config.ignoreUsers && config.ignoreUsers.includes(user.login)) {
        context.log.info(`User in ignore list, ignoring`)
        return
      }

      if (config.ignoreOrgMembers && (await isOrgMember(context))) {
        context.log.info(`User is a member of the org, ignoring`)
        return
      }

      const response = await context.github.issues.listForRepo(
        context.repo({
          state: 'all',
          creator: user.login,
        }),
      )

      const countIssue = response.data.filter((data) => !data.pull_request)
      if (countIssue.length === 1) {
        context.github.issues.createComment(
          context.issue({ body: config.newIssueWelcomeComment }),
        )
      }
    },
  )

  app.on(
    'pull_request.opened',
    async (context): Promise<void> => {
      const config = await fetchConfiguration(context)
      const user = context.payload.issue.user

      if (!config.newPRWelcomeComment) {
        return
      }

      if (config.ignoreBots && user.type === 'Bot') {
        context.log.info(`User is a bot, ignoring`)
        return
      }

      if (config.ignoreUsers && config.ignoreUsers.includes(user.login)) {
        context.log.info(`User in ignore list, ignoring`)
        return
      }

      if (config.ignoreOrgMembers && (await isOrgMember(context))) {
        context.log.info(`User is a member of the org, ignoring`)
        return
      }

      const response = await context.github.issues.listForRepo(
        context.repo({
          state: 'all',
          creator: user.login,
        }),
      )

      const countPR = response.data.filter((data) => data.pull_request)
      if (countPR.length === 1) {
        context.github.issues.createComment(
          context.issue({ body: config.newPRWelcomeComment }),
        )
      }
    },
  )

  app.on(
    'pull_request.closed',
    async (context): Promise<void> => {
      if (!context.payload.pull_request.merged) {
        return
      }

      const config = await fetchConfiguration(context)
      const user = context.payload.pull_request.user
      const { owner, repo } = context.repo()

      if (!config.firstPRMergeComment) {
        return
      }

      if (config.ignoreBots && user.type === 'Bot') {
        context.log.info(`User is a bot, ignoring`)
        return
      }

      if (config.ignoreUsers && config.ignoreUsers.includes(user.login)) {
        context.log.info(`User in ignore list, ignoring`)
        return
      }

      if (config.ignoreOrgMembers && (await isOrgMember(context))) {
        context.log.info(`User is a member of the org, ignoring`)
        return
      }

      const response = await context.github.search.issuesAndPullRequests({
        q: `is:pr is:merged author:${user.login} repo:${owner}/${repo}`,
      })

      const mergedPRs = response.data.items.filter(
        (pr) => pr.number !== context.payload.pull_request.number,
      )

      if (mergedPRs.length === 0) {
        context.github.issues.createComment(
          context.issue({ body: config.firstPRMergeComment }),
        )
      }
    },
  )
}
