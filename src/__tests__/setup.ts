import 'dotenv/config'

// A developer who put a real webhook in the local .env (to try alerts end to
// end with `pnpm status:collect`) must not have every test run post to Slack.
// Tests that exercise the alerts set the webhook explicitly on a mocked env.
delete process.env.SLACK_ALERTS_WEBHOOK_URL
