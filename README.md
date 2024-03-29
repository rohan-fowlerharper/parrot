# Parrot 🦜

Parrot is a TypeScript CLI to quickly compare one branch to all other branches in a git repository.

## Basic Usage:

To use the CLI, first you will need to generate a GitHub personal access token. You can do this by going to [Settings]('https://github.com/settings/tokens') and clicking on "Generate new token". You will need to give the token the `repo` scope.

Once you have a token,

```sh
# if you haven't already
# install ts-node globally, this let's us run the script with TS directly
npm install -g ts-node

# install parrot globally
pnpm add -g https://github.com/enspiral-dev-academy/parrot.git
# or
npm install -g https://github.com/enspiral-dev-academy/parrot.git

# init the CLI with the token
parrot init [token]
# or
parrot init
code ~/.parrot/.env # paste github access token here

# run
parrot <url> [branch] [options] # branch is optional if you provide a url with a branch in it
```

## Usages

```sh
# audit a single challenge with a. one branch or b. all branches
parrot <url> [branch] [options]

# audit a single branch against all other branches across all challenge repositories in a cohort
# cohort: must be the url string that appears in a cohort organization, e.g. `aihe-popoto-2022`
# branch-name: will match any branch containing this string, e.g. `hook` will match `hook` and `hook-captain`
parrot student <cohort> <branch-name> [options]
```

## Options

- `--verbose`, `-v`: Show more information in logs (default: `false`)'
- '--all', '-A': Compare all branches to all other branches (overrides any branch provided) (default: `false`)

## Example Usage

Input:
```sh
parrot https://github.com/aihe-2021/todo-full-stack/tree/rohan
```

Output:
```sh
Format:
[overlap as %] :: [n overlaps]/[n total lines added] :: [branch 1] --- [branch 2]

16.2% :: 73/450  :: rohan --- polly:
16.4% :: 46/281  :: rohan --- wanna:
16.7% :: 47/281  :: rohan --- cracka
17.1% :: 48/281  :: rohan --- rodrigo-the-bird
17.4% :: 49/281  :: rohan --- tweety
66.9% :: 241/360 :: rohan --- jv-solution
94.7% :: 266/281 :: rohan --- captain-hook
```

Other example inputs:
```sh
# for lots of console.log spam
parrot https://github.com/aihe-2021/todo-full-stack/tree/rohan --verbose

# to compare all branches with every other branch
parrot https://github.com/aihe-2021/todo-full-stack --all
```

Higher percentage means greater overlap between the two solutions/commits. Copied branches tend to have >60% overlap.
