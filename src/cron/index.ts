import chalk from 'chalk'
import { EmbedBuilder, WebhookClient } from 'discord.js'
import compareAll from '../commands/compare-all'
import { logComparisonResults } from '../utils/chalkies'
import { createCompareLinks } from '../utils/compare'
import { toPercentage } from '../utils/formatters'
import { github } from '../utils/github'

const ACTIVE_COHORTS = [
  'aihe-ahoaho-2022',
  'aihe-popoto-2022',
  'hihi-2022',
  'horoeka-2022',
]

export default async function run(cohort: string) {
  const activeChallenges = await getActiveChallengeNames()

  if (!activeChallenges) return

  const { data: allRepos } = await github.request('GET /orgs/{org}/repos', {
    org: cohort,
  })

  const repos = allRepos.filter((r) => activeChallenges.includes(r.name))

  const toNZDate = (date: string) => new Date(date).toLocaleString('en-NZ')

  const recentlyPushedRepos = repos
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      created: toNZDate(r.created_at!),
      updated: toNZDate(r.updated_at!),
      pushed: toNZDate(r.pushed_at!),
      pushedRaw: r.pushed_at,
    }))
    .filter((r) => isLessThan24HourAgo(r.pushedRaw))

  const allComparisons = await Promise.all(
    recentlyPushedRepos.map(async (repo) => {
      const comparisons = await compareAll({
        owner: cohort,
        repo: repo.name,
      })
      return { repo: repo.name, comparisons }
    })
  )

  // NOTE: probably should console log all the comparisons (for record keeping)
  // TODO: define some metrics for what is a dangerous comparison
  const topComparisons = allComparisons.map((c) => ({
    ...c,
    comparisons: c.comparisons.slice(-5),
  }))

  console.log(chalk` {bold 🦜: {bold.green ${cohort}}}`)
  topComparisons.forEach((c) => logComparisonResults(c.comparisons))

  const alarmBellComparisons = topComparisons
    .flatMap((c) => {
      const { repo, comparisons } = c
      return comparisons
        .filter((c) => c.ratio > 0.9)
        .map((c) => ({
          ...c,
          repo,
        }))
    })
    .sort((a, b) => b.ratio - a.ratio)

  const webhookClient = new WebhookClient({
    url: process.env.DISCORD_WEBHOOK_URL!,
  })

  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env

  const summaryEmbed = new EmbedBuilder()
    .setTitle(`🦜: Cohort Comparison Report for ${cohort}`)
    .setDescription('A report of the last 24 hours of cohort comparisons')
    .setColor('#e91e63')
    .addFields(
      {
        name: 'Link:',
        value: `
      [GitHub Actions Report](${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})`,
        inline: true,
      },
      {
        name: 'Date:',
        value: `${new Date().toLocaleString('en-NZ')} (NZT)`,
        inline: true,
      },
      {
        name: 'Summary:',
        value: `${
          recentlyPushedRepos.length
        } repos pushed to in the last 24 hours
        ${allComparisons.reduce(
          (acc, c) => acc + c.comparisons.length,
          0
        )} comparisons made`,
      }
    )

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
            return `${toPercentage(c.ratio)} :: [${
              c.base.name
            }](${baseLink}) ⇔ [${c.comparison.name}](${comparisonLink}) :: [${
              c.repo
            }](https://github.com/${cohort}/${c.repo}/branches)`
          })
          .join('\n')}`
      )
  }

  await webhookClient.send({
    content: 'Chirp chirp!',
    avatarURL:
      'https://creazilla-store.fra1.digitaloceanspaces.com/emojis/55483/parrot-emoji-clipart-xl.png',
    embeds: dangerEmbed ? [summaryEmbed, dangerEmbed] : [summaryEmbed],
  })
}

// TODO: only select a whitelist of challenge repos
const getActiveChallengeNames = async () => {
  const { data: challenges } = await github.rest.repos.getContent({
    owner: 'dev-academy-challenges',
    repo: 'challenges',
    path: 'packages',
  })

  if (!Array.isArray(challenges)) {
    return
  }

  return challenges.map((c) => c.name).filter((c) => !c.includes('solution'))
}

function isLessThan24HourAgo(date: string | null | undefined) {
  if (!date) {
    return undefined
  }
  const thenAsDate = new Date(date)
  const then = thenAsDate.getTime()
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000

  return then > twentyFourHoursAgo
}

async function main() {
  for (const cohort of ACTIVE_COHORTS) {
    run(cohort)
  }
}
main()
