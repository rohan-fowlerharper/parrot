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

## Options

- `--verbose`, `-v`: Show more information in logs (default: `false`)'

## Example Usage

Input:
```sh
parrot https://github.com/aihe-2021/todo-full-stack/tree/rohan
```

Output:
```sh
Format:
[branch] <-> [branch]: [n overlaps]/[n total lines added] :: [overlap as %]

rohan <-> tweety: 61/711 :: 8.6%
rohan <-> jv-solution: 67/711 :: 9.4%
rohan <-> coco: 111/711 :: 15.6%
rohan <-> buddy: 100/711 :: 14.1%
rohan <-> lucky: 0/711 :: 0.0%
rohan <-> sunny: 59/711 :: 8.3%
```

Higher percentage means greater overlap between the two solutions/commits. Copied branches tend to have >60% overlap.