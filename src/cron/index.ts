import { IncomingWebhook } from '@slack/webhook'
import chalk from 'chalk'
import { EmbedBuilder, WebhookClient } from 'discord.js'
import invariant from 'tiny-invariant'
import compareAll from '../commands/compare-all'
import { logComparisonResults } from '../utils/chalkies'
import { createCompareLinks } from '../utils/compare'
import { getActiveChallengeNames, getAllRepos } from '../utils/github'
import { sortByRatio, toFraction, toPercentage } from '../utils/formatters'

const ACTIVE_COHORTS = ['whai-2023', 'kahikatea-2023', 'piwakawaka-2023']

export default async function run(cohort: string, activeChallenges: string[]) {
  const { data: allRepos } = await getAllRepos(cohort)
  const repos = allRepos.filter((r) => activeChallenges.includes(r.name))

  const recentlyPushedRepos = repos
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      created: r.created_at!,
      updated: r.updated_at!,
      pushed: r.pushed_at!,
    }))
    .filter((r) => isLessThan7DaysAgo(r.pushed))

  console.log(`🦜: ${cohort} has ${allRepos.length} repos`)

  const allComparisons = await Promise.all(
    recentlyPushedRepos.map(async (repo) => {
      const comparisons = await compareAll({
        owner: cohort,
        repo: repo.name,
      })
      return {
        repo: repo.name,
        comparisons: comparisons.map((c) => ({
          ...c,
          repo: repo.name,
        })),
      }
    })
  )

  // NOTE: probably should console log all the comparisons (for record keeping)
  // TODO: define some metrics for what is a dangerous comparison
  const topN = 20
  const topComparisons = allComparisons.map((c) => ({
    ...c,
    comparisons: c.comparisons.slice(-topN).filter((c) => !c.isSolo),
  }))

  console.log(chalk`{bold 🦜: {bold.green ${cohort}}}`)
  topComparisons.forEach(({ repo, comparisons }) => {
    if (comparisons.length === 0) return
    console.log(
      chalk`🦜: Comparison for top {bold.green ${topN}} branches in {bold.green ${cohort}}/{bold.green ${repo}}`
    )
    logComparisonResults(comparisons)
  })

  const alarmBellComparisons = allComparisons
    .flatMap((c) =>
      c.comparisons
        .filter((c) => c.ratio > 0.8 && !c.isSolo)
        .filter((c) => {
          const { base, comparison } = c
          if (!base.pushedAt || !comparison.pushedAt) {
            return true
          }
          if (
            isLessThan7DaysAgo(base.pushedAt) ||
            isLessThan7DaysAgo(comparison.pushedAt)
          ) {
            return true
          }
          return false
        })
    )
    .sort(sortByRatio)

  // console.log(alarmBellComparisons)

  if (!process.env.DISCORD_WEBHOOK_URL || !process.env.SLACK_WEBHOOK_URL) {
    console.log(
      chalk`{bold.red 🦜: Missing DISCORD_WEBHOOK_URL or SLACK_WEBHOOK_URL, skipping messaging}`
    )
    return
  }
  // DISCORD MESSAGING
  const discordWebhook = new WebhookClient({
    url: process.env.DISCORD_WEBHOOK_URL!,
  })

  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_JOB } =
    process.env

  const summaryEmbed = new EmbedBuilder()
    .setTitle(`🦜: Cohort Comparison Report for ${cohort}`)
    .setDescription('A report of the last 24 hours of cohort comparisons')
    .setColor('#e91e63')
    .addFields({
      name: 'Summary:',
      value: `${recentlyPushedRepos.length} repos pushed to in the last 24 hours
        ${allComparisons.reduce(
          (acc, c) => acc + c.comparisons.length,
          0
        )} comparisons made`,
      inline: true,
    })

  // only in CI environment
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    summaryEmbed.addFields({
      name: 'Link:',
      value: `
    [GitHub Actions Report](${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs/${GITHUB_JOB})`,
      inline: true,
    })
  }

  let dangerEmbed
  if (alarmBellComparisons.length > 0) {
    dangerEmbed = new EmbedBuilder()
      .setTitle('🚨 Danger Zone 🚨')
      .setColor('#e91e63')
      .setTimestamp()
      .setDescription(
        `${alarmBellComparisons
          .map((c) => {
            const [baseLink, comparisonLink] = createCompareLinks({
              org: cohort,
              repo: c.repo,
              comparison: c,
            })
            return `${toPercentage(c.ratio)} (${toFraction(
              c.totalNOverlaps,
              c.totalAdditions
            )}) :: [${c.base.name}](${baseLink}) ⇔ [${
              c.comparison.name
            }](${comparisonLink}) :: [${c.repo}](https://github.com/${cohort}/${
              c.repo
            }/branches)`
          })
          .join('\n')}`
      )
  }

  if (!dangerEmbed) {
    summaryEmbed.setTimestamp().setColor('#f294b4')
  }

  await discordWebhook.send({
    content: 'Chirp chirp!',
    avatarURL:
      'https://creazilla-store.fra1.digitaloceanspaces.com/emojis/55483/parrot-emoji-clipart-xl.png',
    embeds: dangerEmbed ? [summaryEmbed, dangerEmbed] : [summaryEmbed],
  })

  // SLACK MESSAGING
  const slackWebhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL!)

  const slackSummary = {
    text: `🦜: Cohort Comparison Report for ${cohort}`,
    attachments: [
      {
        color: '#e91e63',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `A report of the last 24 hours of cohort comparisons`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Summary:*\n${
                  recentlyPushedRepos.length
                } repos pushed to in the last 24 hours\n${allComparisons.reduce(
                  (acc, c) => acc + c.comparisons.length,
                  0
                )} comparisons made`,
              },
            ],
          },
        ],
      },
    ],
  }

  // only in CI environment
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    slackSummary?.attachments[0]?.blocks[1]?.fields?.push({
      type: 'mrkdwn',
      text: `*Link:*\n<${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs/${GITHUB_JOB}|GitHub Actions Report>`,
    })
  }

  let slackDanger: any
  if (alarmBellComparisons.length > 0) {
    slackDanger = {
      text: `🚨 Danger Zone 🚨`,
      attachments: [
        {
          color: '#e91e63',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${alarmBellComparisons
                  .map((c) => {
                    const [baseLink, comparisonLink] = createCompareLinks({
                      org: cohort,
                      repo: c.repo,
                      comparison: c,
                    })
                    return `${toPercentage(c.ratio)} (${toFraction(
                      c.totalNOverlaps,
                      c.totalAdditions
                    )}) :: <${baseLink}|${c.base.name}> ⇔ <${comparisonLink}|${
                      c.comparison.name
                    }> :: <https://github.com/${cohort}/${c.repo}/branches|${
                      c.repo
                    }>`
                  })
                  .join('\n')}`,
              },
            },
          ],
        },
      ],
    }
  }

  if (!slackDanger) {
    slackSummary.attachments[0].color = '#f294b4'
  }

  await slackWebhook.send(slackSummary)
  if (slackDanger) {
    await slackWebhook.send(slackDanger)
  }
}

// TODO: only select a whitelist of challenge repos

function isLessThanXHoursAgo(
  date: string | null | undefined,
  numHours: number
) {
  if (!date) {
    return undefined
  }
  const thenAsDate = new Date(date)
  const then = thenAsDate.getTime()
  const xHoursAgo = Date.now() - numHours * 60 * 60 * 1000

  return then > xHoursAgo
}

function isLessThan7DaysAgo(date: string | null | undefined) {
  return isLessThanXHoursAgo(date, 7 * 24)
}

async function main() {
  const activeChallenges = await getActiveChallengeNames()

  invariant(activeChallenges, 'Could not get active challenges')

  for (const cohort of ACTIVE_COHORTS) {
    await run(cohort, activeChallenges)
  }
}
main()
