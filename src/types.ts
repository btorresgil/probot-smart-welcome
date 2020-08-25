export interface ConfigFile {
  welcome: AppConfig
}

export interface AppConfig {
  newIssueWelcomeComment: string
  newPRWelcomeComment: string
  firstPRMergeComment: string
  ignoreUsers: string[]
  ignoreBots: boolean
  ignoreOrgMembers: boolean
}
