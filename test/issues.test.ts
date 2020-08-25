import nock from 'nock'
// Requiring our app implementation
import myProbotApp from '../src'
import { Probot } from 'probot'
// Requiring our fixtures
import payload from './fixtures/issue.opened.json'
const fs = require('fs')
const path = require('path')

const issueCreatedBody = {
  body:
    'Thanks for opening your first issue here! Be sure to follow the issue template!',
}

jest.setTimeout(5000)
// nock.emitter.on('no match', (req: any) => {
// console.log('no match:', JSON.stringify(req, null, 2))
// console.log('no match:', req.path)
// })
// nock.recorder.rec()

describe('Community Health App', () => {
  let probot: any
  let mockCert: string

  beforeAll((done: Function) => {
    fs.readFile(
      path.join(__dirname, 'fixtures/mock-cert.pem'),
      (err: Error, cert: string) => {
        if (err) return done(err)
        mockCert = cert
        done()
      },
    )
  })

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({ id: 123, privateKey: mockCert, githubToken: 'test' })
    // Load our app into probot
    probot.load(myProbotApp)
  })

  test('webhook checks for app config', async (done) => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })
      .get('/app/installations?per_page=100')
      .reply(200, [])

    nock('https://api.github.com')
      .get('/repos/my-org/my-repo/contents/.github%2Fconfig.yml')
      .reply(200, {})
      .get(
        '/repos/my-org/.github/contents/.github%2Fconfig.yml',
        (body: any) => {
          done()
          return true
        },
      )
      .reply(200, {})

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })

  test('creates a comment when first issue is opened', async (done) => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get('/repos/my-org/my-repo/contents/.github%2Fconfig.yml')
      .reply(200, {})
      .get('/repos/my-org/.github/contents/.github%2Fconfig.yml')
      .reply(200, {})

    // Collects all issues by this creator
    nock('https://api.github.com')
      .get('/repos/my-org/my-repo/issues')
      .query({ state: 'all', creator: 'my-user' })
      .reply(200, [
        {
          id: 1,
          user: {
            login: 'my-user',
          },
        },
      ])

    // Test that a comment is posted
    nock('https://api.github.com')
      .post('/repos/my-org/my-repo/issues/2/comments', (body) => {
        expect(body).toMatchObject(issueCreatedBody)
        done()
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })

  test('does not create a comment when second issue is opened', async (done) => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    nock('https://api.github.com')
      .get('/repos/my-org/my-repo/contents/.github%2Fconfig.yml')
      .reply(200, {})
      .get('/repos/my-org/.github/contents/.github%2Fconfig.yml')
      .reply(200, {})

    // Collects all issues by this creator
    nock('https://api.github.com')
      .get('/repos/my-org/my-repo/issues')
      .query({ state: 'all', creator: 'my-user' })
      .reply(200, [
        {
          id: 1,
          user: {
            login: 'my-user',
          },
        },
        {
          id: 2,
          user: {
            login: 'my-user',
          },
        },
      ])

    nock.emitter.on('no match', (req: any) => {
      expect(req.path).not.toBe('/repos/my-org/my-repo/issues/2/comments')
    })

    setTimeout(() => {
      done()
      return true
    }, 3000)

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})
