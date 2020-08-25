import { Context } from 'probot'
import { RequestError } from '@octokit/request-error'

import { AppConfig, ConfigFile } from './types'

export const defaultConfig = {
  welcome: {
    newIssueWelcomeComment:
      'Thanks for opening your first issue here! Be sure to follow the issue template!',
    newPRWelcomeComment:
      'Thanks for opening this pull request! Please check out our contributing guidelines.',
    firstPRMergeComment:
      'Congrats on merging your first pull request! We are grateful to you!',
    ignoreUsers: [],
    ignoreBots: true,
    ignoreOrgMembers: false,
  },
}

export const fetchConfiguration = async (
  context: Context,
): Promise<AppConfig> => {
  const config = await context.config<ConfigFile>('config.yml', defaultConfig)
  if (!config) throw new Error(`Can't get App configuration`)
  return config.welcome
}

export const checkHttpError = (err: RequestError): void => {
  if (err.status === 404) return
  throw err
}

export const isOrgMember = async (context: Context<any>): Promise<boolean> => {
  const org = context.payload.repository.owner.login
  const username =
    context.payload.issue?.user?.login ||
    context.payload.pull_request.user.login
  try {
    const response = await context.github.orgs.checkMembershipForUser({
      org,
      username,
    })
    return response.status === 204
  } catch (err) {
    // From:
    // https://docs.github.com/en/rest/reference/orgs#check-organization-membership-for-a-user
    // 204: Yes, member
    // 302: Requester is not a member
    // 404: No, not a member
    if (err.status === 302 || err.status === 404) {
      context.log.debug(`Not a member - ${username} - status ${err.status}`)
      return false
    } else {
      checkHttpError(err)
    }
  }
  return false
}
